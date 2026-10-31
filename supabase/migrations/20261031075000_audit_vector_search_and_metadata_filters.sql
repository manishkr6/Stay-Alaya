-- =========================================================================
-- Migration: 20261031075000_audit_vector_search_and_metadata_filters.sql
-- Description:
--   1. Enforce strict cosine distance / similarity threshold in pgvector search.
--   2. Enforce strict exact-match gender filtering with punctuation/spacing normalization
--      (handles 'coed', 'co ed', 'co_ed', 'co-ed' without bleeding into Girls/Boys).
--   3. Implement comprehensive metadata pre-filtering (budget bounds, case-insensitive
--      amenity array containment, verified status, locality, room type) as strict WHERE clauses.
--   4. Exclude inactive or soft-deleted owner listings and unapproved records.
--   5. Add high-performance indexes for vector HNSW, GIN amenities, gender, and room_type.
-- =========================================================================

-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 1. Optimized Indexes for Metadata Pre-Filtering & Vector Similarity
CREATE INDEX IF NOT EXISTS idx_pg_listings_embedding ON public.pg_listings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_pg_listings_amenities ON public.pg_listings USING gin (amenities);
CREATE INDEX IF NOT EXISTS idx_pg_listings_gender ON public.pg_listings (gender_preference);
CREATE INDEX IF NOT EXISTS idx_pg_listings_room_type ON public.pg_listings (room_type);
CREATE INDEX IF NOT EXISTS idx_pg_listings_status_available ON public.pg_listings (status, is_available) WHERE is_deleted = false;

-- 2. Primary Vector & Hybrid Search RPC: match_pg_listings
CREATE OR REPLACE FUNCTION public.match_pg_listings(
    query_embedding vector(384) DEFAULT NULL,
    similarity_threshold double precision DEFAULT 0.60,
    match_count integer DEFAULT 20,
    match_offset integer DEFAULT 0,
    filter_min_rent numeric DEFAULT NULL,
    filter_max_rent numeric DEFAULT NULL,
    filter_locality text DEFAULT NULL,
    filter_gender text DEFAULT NULL,
    filter_room_type text DEFAULT NULL,
    filter_amenities text[] DEFAULT NULL,
    filter_is_verified boolean DEFAULT FALSE
)
RETURNS TABLE(
    id uuid,
    owner_id uuid,
    title text,
    description text,
    locality text,
    address text,
    rent numeric,
    deposit numeric,
    room_type text,
    gender_preference text,
    amenities text[],
    rules text[],
    images text[],
    contact_number text,
    is_verified boolean,
    is_available boolean,
    status text,
    average_rating numeric,
    total_reviews integer,
    similarity double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.owner_id,
    p.title,
    p.description,
    p.locality,
    p.address,
    p.rent,
    p.deposit,
    p.room_type,
    p.gender_preference,
    p.amenities,
    p.rules,
    p.images,
    p.contact_number,
    p.is_verified,
    p.is_available,
    p.status,
    p.average_rating,
    p.total_reviews,
    CASE
      WHEN query_embedding IS NOT NULL AND p.embedding IS NOT NULL
        THEN (1 - (p.embedding <=> query_embedding))::double precision
      ELSE 1.0::double precision
    END AS similarity
  FROM public.pg_listings p
  WHERE
    -- Availability and approval constraints
    p.is_deleted = false
    AND p.status = 'approved'
    AND p.is_available = true
    -- Ensure property owner is active and not soft-deleted
    AND EXISTS (
      SELECT 1 FROM public.profiles prof
      WHERE prof.id = p.owner_id
        AND prof.is_active = TRUE
        AND prof.is_deleted = FALSE
    )
    -- Metadata Pre-Filtering: Budget (Rent) bounds
    AND (filter_min_rent IS NULL OR p.rent >= filter_min_rent)
    AND (filter_max_rent IS NULL OR p.rent <= filter_max_rent)
    -- Metadata Pre-Filtering: Normalized Gender (Strict exact match; handles 'coed', 'co-ed', 'co ed', 'co_ed')
    AND (
      filter_gender IS NULL
      OR filter_gender = ''
      OR LOWER(REGEXP_REPLACE(TRIM(p.gender_preference), '[-_\s]+', '', 'g')) = 
         LOWER(REGEXP_REPLACE(TRIM(filter_gender), '[-_\s]+', '', 'g'))
    )
    -- Metadata Pre-Filtering: Room Type
    AND (
      filter_room_type IS NULL
      OR filter_room_type = ''
      OR LOWER(REGEXP_REPLACE(TRIM(p.room_type), '[-_\s]+', '', 'g')) = 
         LOWER(REGEXP_REPLACE(TRIM(filter_room_type), '[-_\s]+', '', 'g'))
    )
    -- Metadata Pre-Filtering: Locality / Location
    AND (
      filter_locality IS NULL
      OR filter_locality = ''
      OR p.locality ILIKE '%' || TRIM(filter_locality) || '%'
      OR p.address ILIKE '%' || TRIM(filter_locality) || '%'
    )
    -- Metadata Pre-Filtering: Amenity Array (Case-insensitive array containment)
    AND (
      filter_amenities IS NULL
      OR filter_amenities = '{}'::text[]
      OR p.amenities @> filter_amenities
      OR (
        SELECT bool_and(EXISTS (
          SELECT 1 FROM unnest(p.amenities) pa 
          WHERE LOWER(REGEXP_REPLACE(TRIM(pa), '[-_\s]+', '', 'g')) = 
                LOWER(REGEXP_REPLACE(TRIM(fa), '[-_\s]+', '', 'g'))
        ))
        FROM unnest(filter_amenities) fa
      )
    )
    -- Metadata Pre-Filtering: Verified-only flag
    AND (
      filter_is_verified IS NOT TRUE
      OR p.is_verified = TRUE
    )
    -- Vector Similarity Threshold: STRICT (Cosine distance threshold)
    -- Irrelevant vectors or missing embeddings MUST return zero results
    AND (
      query_embedding IS NULL
      OR (
        p.embedding IS NOT NULL
        AND (1 - (p.embedding <=> query_embedding)) >= similarity_threshold
      )
    )
  ORDER BY
    CASE
      WHEN query_embedding IS NOT NULL THEN (p.embedding <=> query_embedding)
      ELSE NULL
    END ASC NULLS LAST,
    p.is_verified DESC,
    p.average_rating DESC,
    p.created_at DESC
  LIMIT match_count
  OFFSET match_offset;
END;
$$;
