"""
Login rate throttle — prevent brute force attacks.
10 attempts per hour per IP.
"""
from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'
    rate = '10/hour'
