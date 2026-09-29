from rest_framework.throttling import UserRateThrottle


class KiraBurstThrottle(UserRateThrottle):
    scope = "kira_burst"


class KiraDailyThrottle(UserRateThrottle):
    scope = "kira_daily"
