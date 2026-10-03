import hashlib
import hmac
import unittest

from starlette.requests import Request

from app.config import settings
from app.rate_limit import client_key

SOCKET_IP = "9.9.9.9"


def make_request(headers: dict[str, str]) -> Request:
    return Request({
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": (SOCKET_IP, 1234),
    })


def sign(ip: str) -> str:
    return hmac.new(settings.internal_api_secret.encode(), ip.encode(), hashlib.sha256).hexdigest()


class ClientKeyTests(unittest.TestCase):
    def test_direct_request_uses_socket_address(self):
        self.assertEqual(client_key(make_request({})), SOCKET_IP)

    def test_trusts_forwarded_ip_with_valid_signature(self):
        request = make_request({"X-Client-IP": "1.2.3.4", "X-Client-IP-Signature": sign("1.2.3.4")})
        self.assertEqual(client_key(request), "1.2.3.4")

    def test_ignores_forwarded_ip_without_signature(self):
        self.assertEqual(client_key(make_request({"X-Client-IP": "1.2.3.4"})), SOCKET_IP)

    def test_ignores_forged_signature(self):
        request = make_request({"X-Client-IP": "1.2.3.4", "X-Client-IP-Signature": "deadbeef"})
        self.assertEqual(client_key(request), SOCKET_IP)

    def test_signature_for_a_different_ip_is_rejected(self):
        request = make_request({"X-Client-IP": "5.6.7.8", "X-Client-IP-Signature": sign("1.2.3.4")})
        self.assertEqual(client_key(request), SOCKET_IP)

    def test_malformed_ip_falls_back_to_socket_address(self):
        request = make_request({"X-Client-IP": "not-an-ip", "X-Client-IP-Signature": sign("not-an-ip")})
        self.assertEqual(client_key(request), SOCKET_IP)