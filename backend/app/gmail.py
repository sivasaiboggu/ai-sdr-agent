"""Real Gmail sending (SMTP) for the Sender Agent.

Dry-run is the default: nothing here is called unless
``GMAIL_SEND_ENABLED=true``. Real sends need a Gmail *app password*
(Google Account -> Security -> 2-Step Verification -> App passwords),
supplied as ``GMAIL_APP_PASSWORD`` in ``.env`` — never committed, never
hardcoded. The normal account password does not work with SMTP.

One SMTP connection per call keeps the code simple and testable; the
5-minute gap between mails is enforced by the sender, not here.
"""
import os
import smtplib
import ssl
import uuid
from email.message import EmailMessage
from email.utils import formataddr

from backend.app.config import settings


class GmailNotConfiguredError(RuntimeError):
    """Raised when a real send is requested without an app password."""


def send_mail(to: str, subject: str, body: str, attachments: list[str] | None = None) -> str:
    """Send one mail via Gmail SMTP. Returns the Message-ID on success.

    Raises GmailNotConfiguredError if no app password is configured, and
    lets smtplib errors propagate so the caller can log the failure
    instead of pretending the mail went out.
    """
    if not settings.gmail_app_password:
        raise GmailNotConfiguredError(
            "GMAIL_APP_PASSWORD is not set — create a Gmail app password "
            "(Google Account > Security > 2-Step Verification > App passwords) "
            "and put it in .env. Nothing was sent."
        )
    msg = EmailMessage()
    msg["From"] = formataddr(("Sivasai Boggu", settings.gmail_from))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = f"<{uuid.uuid4().hex}@sdr-agent.local>"
    msg.set_content(body)
    for path in attachments or []:
        with open(path, "rb") as fh:
            data = fh.read()
        msg.add_attachment(
            data,
            maintype="application",
            subtype="pdf",
            filename=os.path.basename(path),
        )
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
        server.login(settings.gmail_from, settings.gmail_app_password)
        server.send_message(msg)
    return str(msg["Message-ID"])
