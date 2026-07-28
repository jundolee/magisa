# 개발 환경 참고사항

## 회사 네트워크(Cato Networks) TLS 인터셉션 — `npx`/`npm`으로 외부 호스트 접근 시 필요한 설정

이 프로젝트를 진행하는 회사 네트워크는 **Cato Networks**의 SASE 프록시가 모든 HTTPS 트래픽을 중간에서 가로채 자체 인증서로 재서명한다 (일종의 합법적 사내 MITM). Windows(스킴/브라우저)는 이 회사 루트 인증서를 신뢰 저장소에 이미 가지고 있어 문제가 없지만, **Node.js는 자체 CA 번들(Mozilla 기반)을 쓰기 때문에 이 회사 인증서를 모르고 있음.**

### 증상
- `npx @seed-design/cli add ...` 실행 시 `Registry를 가져오지 못했어요` / `fetch failed`
- Node에서 직접 `fetch()`로 외부 호스트(예: seed-design.io) 호출 시 `SELF_SIGNED_CERT_IN_CHAIN` 에러
- **npm 레지스트리(registry.npmjs.org)는 영향 없음** — 아마 별도로 화이트리스트 되어 있거나 다른 처리 경로를 타는 것으로 보임. 문제는 seed-design.io처럼 Cato가 인터셉트하는 임의의 외부 호스트에 Node가 직접 접근할 때 발생.

### 해결 방법
Windows 인증서 저장소에 이미 설치되어 있는 `Cato Networks Root CA`를 내보내 Node에게 알려주면 된다:

```powershell
$certDir = "$env:USERPROFILE\.certs"
New-Item -ItemType Directory -Force -Path $certDir | Out-Null
$cert = Get-ChildItem -Path Cert:\CurrentUser\Root | Where-Object { $_.Subject -like "*Cato Networks*" } | Select-Object -First 1
$b64 = [Convert]::ToBase64String($cert.RawData, 'InsertLineBreaks')
$pem = "-----BEGIN CERTIFICATE-----`n$b64`n-----END CERTIFICATE-----"
Set-Content -Path "$certDir\cato-networks-root-ca.pem" -Value $pem -Encoding ascii
```

그 다음, 외부 호스트에 접근하는 Node 기반 명령(`npx`, 커스텀 스크립트 등) 실행 전에 환경변수를 설정:

```bash
export NODE_EXTRA_CA_CERTS="$HOME/.certs/cato-networks-root-ca.pem"
```

(PowerShell: `$env:NODE_EXTRA_CA_CERTS = "$env:USERPROFILE\.certs\cato-networks-root-ca.pem"`)

### 참고
- 이 인증서 파일은 **회사 네트워크/이 PC에 종속된 것이라 git에 커밋하지 않는다** (`$HOME/.certs/`에 저장, 저장소 밖).
- **Vercel 배포 환경(프로덕션)에는 이 문제가 없다** — Cato 프록시는 이 로컬 개발 PC/네트워크에만 적용되는 것이라, 크론 작업이나 실제 배포된 앱이 RSS 피드 사이트에 접근할 때는 해당되지 않음. 로컬 개발 중 `npx`로 외부 레지스트리(seed-design.io 등)에 접근할 때만 필요.
