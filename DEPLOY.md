# Deploy (iqchan)

이미지를 GHCR에 빌드/푸시하고, 서버에서는 Caddy + docker-compose 스택에 붙인다.
호스트 포트는 노출하지 않고 Caddy가 컨테이너 내부 포트 **3007** 로 reverse_proxy 한다.

## 1. CI (GitHub Actions)

`main`/`devnet` 에 push 하면 `.github/workflows/build.yml` 이 이미지를 빌드해
`ghcr.io/IQCoreTeam/iq-chan:latest` (및 `:main`, `:sha-...`) 로 푸시한다.

`NEXT_PUBLIC_*` 값은 빌드타임에 클라이언트 번들로 박힌다(런타임 주입 불가).
실제 Helius 키를 레포에 평문으로 두지 않기 위해 GitHub Secret 으로 주입한다.

레포 Settings → Secrets and variables → Actions 에 추가:

- **Secret** `NEXT_PUBLIC_RPC_ENDPOINT`
  = `https://mainnet.helius-rpc.com/?api-key=767cde04-93dd-4e62-9580-978c74febc93`
- (선택) **Variable** `NEXT_PUBLIC_GATEWAY_URL` = `https://gateway.iqlabs.dev`
  (없으면 기본값 사용)

## 2. 서버: docker-compose 스택에 추가

기존 스택의 `docker-compose.yml` 에 서비스 추가 (호스트 `ports:` 매핑 없음):

```yaml
  iqchan:
    image: ghcr.io/iqcoreteam/iq-chan:latest
    restart: unless-stopped
    networks: [iqlabs-net]
    # 이미지에 NEXT_PUBLIC_* 이 이미 박혀 있어 런타임 env 불필요.
    # 컨테이너 내부 3007 리슨, Caddy 가 가리킴.
```

이미지 갱신:

```bash
docker compose pull iqchan && docker compose up -d iqchan
```

GHCR 이 private 이면 서버에서 먼저 로그인:

```bash
echo <GH_PAT_with_read:packages> | docker login ghcr.io -u <github-user> --password-stdin
```

## 3. Caddyfile

```
chan.iqlabs.dev {
    import common
    reverse_proxy iqchan:3007
}
```

(서브도메인은 원하는 것으로. Caddy reload 후 적용.)
