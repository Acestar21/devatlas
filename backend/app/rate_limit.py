from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(Key_func=get_remote_address)

