"""
ai_assist/signals.py
Hooks into core model saves to trigger AI analysis automatically.
Only enqueues when an Application moves into a state worth analysing.
"""
import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

log = logging.getLogger(__name__)

TRIGGER_STATUSES = {
    'submitted', 'screening', 'eligible', 'under_evaluation'
}


@receiver(post_save, sender='core.Application')
def on_application_save(sender, instance, created, **kwargs):
    """
    Enqueue AI analysis whenever an Application is created or
    moves into a status that warrants analysis.
    """
    if instance.status in TRIGGER_STATUSES:
        from ai_assist.tasks import enqueue_analysis
        enqueue_analysis(instance.pk)
        log.debug(
            'Sahayak: Enqueued analysis for Application #%s (status=%s)',
            instance.pk, instance.status
        )
