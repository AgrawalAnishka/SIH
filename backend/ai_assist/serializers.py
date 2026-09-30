"""
ai_assist/serializers.py
DRF serializers for all Sahayak models.
"""
from rest_framework import serializers
from .models import (
    SubmissionAnalysis, EvaluatorOverride, RewriteSuggestion,
    ClusterGroup, PSInsight, AIActionLog
)


class EvaluatorOverrideSerializer(serializers.ModelSerializer):
    evaluator_username = serializers.CharField(source='evaluator.username', read_only=True)

    class Meta:
        model  = EvaluatorOverride
        fields = ['id', 'field', 'ai_value', 'new_value', 'reason',
                  'evaluator_username', 'created_at']


class SubmissionAnalysisSerializer(serializers.ModelSerializer):
    overrides          = EvaluatorOverrideSerializer(many=True, read_only=True)
    reviewed_by_username = serializers.CharField(
        source='reviewed_by.username', read_only=True, allow_null=True
    )
    application_id     = serializers.IntegerField(source='application.id', read_only=True)
    startup_name       = serializers.CharField(
        source='application.startup.name', read_only=True
    )
    challenge_title    = serializers.CharField(
        source='application.challenge.title', read_only=True
    )

    class Meta:
        model  = SubmissionAnalysis
        fields = [
            'id', 'application_id', 'startup_name', 'challenge_title',
            'version', 'is_current', 'status', 'error_message',
            'cleaned_response', 'short_summary', 'key_points',
            'main_issue', 'category', 'category_confidence',
            'severity', 'priority', 'priority_score', 'priority_reason',
            'flags', 'flag_details',
            'model_name', 'prompt_version', 'provider',
            'reviewed_by_username', 'reviewed_at',
            'overrides', 'created_at', 'updated_at',
        ]


class QueueItemSerializer(serializers.ModelSerializer):
    """Lightweight serializer for the priority queue list view."""
    application_id  = serializers.IntegerField(source='application.id', read_only=True)
    startup_name    = serializers.CharField(
        source='application.startup.name', read_only=True
    )
    challenge_title = serializers.CharField(
        source='application.challenge.title', read_only=True
    )
    app_status      = serializers.CharField(source='application.status', read_only=True)
    is_reviewed     = serializers.SerializerMethodField()

    def get_is_reviewed(self, obj):
        return obj.reviewed_by_id is not None

    class Meta:
        model  = SubmissionAnalysis
        fields = [
            'id', 'application_id', 'startup_name', 'challenge_title',
            'app_status', 'status',
            'short_summary', 'category', 'severity', 'priority', 'priority_score',
            'flags', 'is_reviewed', 'created_at',
        ]


class ClusterGroupSerializer(serializers.ModelSerializer):
    member_count       = serializers.IntegerField(source='size', read_only=True)
    representative_summary = serializers.CharField(
        source='representative_analysis.short_summary',
        read_only=True, allow_null=True
    )
    member_ids = serializers.SerializerMethodField()

    def get_member_ids(self, obj):
        return list(obj.member_analyses.values_list('application_id', flat=True))

    class Meta:
        model  = ClusterGroup
        fields = [
            'id', 'label', 'description', 'member_count',
            'avg_priority_score', 'representative_summary', 'member_ids',
            'run_id', 'created_at',
        ]


class PSInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PSInsight
        fields = [
            'id', 'challenge_id', 'overall_summary', 'top_issues', 'stats',
            'is_stale', 'status', 'error_message', 'generated_at',
            'run_id', 'created_at', 'updated_at',
        ]


class RewriteSuggestionSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(
        source='requested_by.username', read_only=True
    )
    decided_by_username = serializers.CharField(
        source='decided_by.username', read_only=True, allow_null=True
    )

    class Meta:
        model  = RewriteSuggestion
        fields = [
            'id', 'application_id', 'mode',
            'original_text', 'ai_text', 'validation_warnings',
            'decision', 'final_text',
            'requested_by_username', 'decided_by_username', 'decided_at',
            'model_name', 'prompt_version', 'created_at',
        ]


class AIActionLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(
        source='actor.username', read_only=True, allow_null=True
    )

    class Meta:
        model  = AIActionLog
        fields = ['id', 'actor_username', 'action', 'object_type',
                  'object_id', 'metadata', 'created_at']
