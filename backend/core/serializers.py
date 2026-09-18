from rest_framework import serializers
from .models import *


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['id', 'username', 'role', 'preferred_language']


class TranslationCacheSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranslationCache
        fields = ['source_text_hash', 'source_lang', 'target_lang', 'source_text', 'translated_text', 'created_at']
        read_only_fields = ['source_text_hash', 'created_at']


class TranslationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranslationLog
        fields = ['id', 'timestamp', 'source_lang', 'target_lang', 'provider', 'success', 'error_message']


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Department
        fields = '__all__'


class StartupSerializer(serializers.ModelSerializer):
    sector_tags = serializers.JSONField()
    class Meta:
        model  = Startup
        fields = '__all__'


class ChallengeSerializer(serializers.ModelSerializer):
    eligibility_rules = serializers.JSONField()
    sector_tags       = serializers.JSONField()
    department_name   = serializers.CharField(source='department.name', read_only=True)
    application_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Challenge
        fields = '__all__'
        read_only_fields = ['department']

    def get_application_count(self, obj):
        return obj.application_set.count()


class ApplicationSerializer(serializers.ModelSerializer):
    startup_name                  = serializers.CharField(source='startup.name', read_only=True)
    challenge_title               = serializers.CharField(source='challenge.title', read_only=True)
    department_name               = serializers.CharField(source='challenge.department.name', read_only=True)
    startup_registration_status   = serializers.CharField(source='startup.registration_status', read_only=True)
    startup_rating                = serializers.IntegerField(source='startup.rating', read_only=True)
    startup_sector_tags           = serializers.JSONField(source='startup.sector_tags', read_only=True)
    average_score                 = serializers.SerializerMethodField(read_only=True)
    challenge_eligibility_rules   = serializers.JSONField(source='challenge.eligibility_rules', read_only=True)

    class Meta:
        model             = Application
        fields            = '__all__'
        read_only_fields  = ['startup', 'created_at', 'content_hash']

    def get_average_score(self, obj):
        evals = obj.evaluation_set.filter(conflict_of_interest=False)
        if not evals.exists():
            return None
        scores = [e.total_score for e in evals]
        return round(sum(scores) / len(scores), 1)

    def create(self, validated_data):
        import hashlib
        instance = super().create(validated_data)
        instance.content_hash = hashlib.sha256(
            instance.solution_brief.encode()
        ).hexdigest()
        instance.save(update_fields=['content_hash'])
        return instance


class EligibilityResultSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EligibilityResult
        fields = '__all__'


# R1 — Updated Evaluation serializer (5×10, round)
class EvaluationSerializer(serializers.ModelSerializer):
    evaluator_username = serializers.CharField(source='evaluator.username', read_only=True)
    total_score        = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Evaluation
        fields = '__all__'
        read_only_fields = ['evaluator', 'submitted_at']


class ContractSerializer(serializers.ModelSerializer):
    milestones = serializers.JSONField()
    class Meta:
        model  = Contract
        fields = '__all__'


class ScaleUpEntrySerializer(serializers.ModelSerializer):
    adopting_departments = serializers.JSONField()

    class Meta:
        model  = ScaleUpEntry
        fields = '__all__'


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AuditLog
        fields = '__all__'


# ── Supervision serializers ────────────────────────────────────────────────────

class AIProviderConfigSerializer(serializers.ModelSerializer):
    api_key        = serializers.CharField(write_only=True)
    api_key_masked = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model            = AIProviderConfig
        fields           = ['id', 'department', 'provider', 'api_key', 'api_key_masked', 'enabled']
        read_only_fields = ['department']

    def get_api_key_masked(self, obj):
        if not obj.api_key:
            return ''
        return 'sk-••••••••' + obj.api_key[-4:]


class NoveltyCheckSerializer(serializers.ModelSerializer):
    similar_products = serializers.JSONField()

    class Meta:
        model  = NoveltyCheck
        fields = ['id', 'application', 'verdict', 'similar_products', 'explanation', 'checked_at']


# ── Rating & Badge serializers (R2, R3) ────────────────────────────────────────

class RatingHistorySerializer(serializers.ModelSerializer):
    startup_name    = serializers.CharField(source='startup.name', read_only=True)
    challenge_title = serializers.CharField(source='application.challenge.title', read_only=True)

    class Meta:
        model  = RatingHistory
        fields = '__all__'


class StartupBadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StartupBadge
        fields = ['id', 'badge_key', 'earned_at']


class PrototypeSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PrototypeSubmission
        fields = '__all__'
