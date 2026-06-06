from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    CustomTokenObtainPairSerializer,
)

User = get_user_model()

# View handles the actual request and response.

# user registration
# generics.CreateAPIView used to create a new object.
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all() # tells which model it works with
    serializer_class = RegisterSerializer # which Serializer to validate and create the user.
    permission_classes = [AllowAny]

# login/JWT token generation
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

# get currently logged-in user profile
class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user