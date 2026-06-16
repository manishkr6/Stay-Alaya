import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.settings import get_settings


async def send_email(*, to: str, subject: str, html: str) -> None:
    settings = get_settings()
    if not settings.smtp_user or not settings.smtp_pass:
        raise RuntimeError("SMTP is not configured")

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"Stay Alaya <{settings.smtp_user}>"
    message["To"] = to
    message.attach(MIMEText(html, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_pass)
        server.sendmail(settings.smtp_user, to, message.as_string())