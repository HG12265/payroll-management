"""
Management command: create_superadmin
Creates the default superadmin account:
  email: superadmin@example.com
  password: SuperAdmin@123
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

SUPERADMIN_EMAIL = 'superadmin@example.com'
SUPERADMIN_PASSWORD = 'SuperAdmin@123'
SUPERADMIN_FIRST = 'Super'
SUPERADMIN_LAST = 'Admin'


class Command(BaseCommand):
    help = 'Create default superadmin account (superadmin@example.com / SuperAdmin@123)'

    def handle(self, *args, **options):
        if User.objects.filter(email=SUPERADMIN_EMAIL).exists():
            user = User.objects.get(email=SUPERADMIN_EMAIL)
            # Make sure it has correct role / flags
            user.role = User.ADMIN
            user.is_staff = True
            user.is_superuser = True
            user.is_approved = True
            user.is_active = True
            user.set_password(SUPERADMIN_PASSWORD)
            user.save()
            self.stdout.write(self.style.WARNING(
                f'[UPDATED] Superadmin {SUPERADMIN_EMAIL} already existed — password & roles reset.'
            ))
        else:
            User.objects.create_user(
                email=SUPERADMIN_EMAIL,
                password=SUPERADMIN_PASSWORD,
                first_name=SUPERADMIN_FIRST,
                last_name=SUPERADMIN_LAST,
                role=User.ADMIN,
                is_staff=True,
                is_superuser=True,
                is_approved=True,
                is_active=True,
            )
            self.stdout.write(self.style.SUCCESS(
                f'[CREATED] Superadmin account: {SUPERADMIN_EMAIL} / {SUPERADMIN_PASSWORD}'
            ))
