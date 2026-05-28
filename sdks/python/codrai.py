import requests


class Codrai:
    def __init__(self, api_key, base_url="http://localhost:5000/api/v1"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.chat = _Chat(self)

    def request(self, path, method="GET", json=None, stream=False):
        response = requests.request(
            method,
            f"{self.base_url}{path}",
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            json=json,
            stream=stream,
            timeout=120,
        )
        if response.status_code >= 400:
            try:
                message = response.json().get("error", {}).get("message", response.text)
            except Exception:
                message = response.text
            raise RuntimeError(message)
        return response if stream else response.json()


class _Chat:
    def __init__(self, client):
        self.completions = _Completions(client)


class _Completions:
    def __init__(self, client):
        self.client = client

    def create(self, model, messages):
        return self.client.request("/chat/completions", method="POST", json={"model": model, "messages": messages})

    def stream(self, model, messages):
        return self.client.request("/chat/stream", method="POST", json={"model": model, "messages": messages}, stream=True)
