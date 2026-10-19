import type { Metadata } from "next";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { SITE_NAME } from "@/app/seo";

const CONTACT_EMAIL = "yijunsuc@gmail.com";
const EFFECTIVE_DATE = "2026년 10월 19일";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Text as="h2" textStyle="t5Bold" color="fg.neutral">
        {title}
      </Text>
      <div style={{ lineHeight: 1.7, color: "var(--seed-color-fg-neutral-muted)" }}>{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main>
      <PageHeader />

      <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 12 }}>
        <div>
          <Text as="h1" textStyle="t7Bold" color="fg.neutral">
            개인정보처리방침
          </Text>
          <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 8 }}>
            시행일자: {EFFECTIVE_DATE}
          </Text>
        </div>

        <Section title="1. 수집하는 개인정보 항목">
          {SITE_NAME}(이하 &ldquo;서비스&rdquo;)는 회원가입 및 로그인 과정에서 아래 정보를 수집합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>이메일/비밀번호로 가입 시: 이메일 주소</li>
            <li>Google 계정으로 로그인 시: 이메일 주소, 이름, 프로필 사진(Google이 제공하는 범위 내)</li>
          </ul>
          또한 서비스 이용 과정에서 아래 이용 기록과 분석 정보가 자동으로 생성·수집됩니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>글 읽음 여부, 즐겨찾기 표시 등 이용 기록</li>
            <li>분석 도구가 반복 방문을 구분하기 위해 생성하는 브라우저·세션 식별자와 쿠키 또는 브라우저 저장소 정보</li>
            <li>Google Analytics 4가 수집하는 대략적인 위치, 브라우저·기기 정보 및 브라우저별 client ID</li>
          </ul>
        </Section>

        <Section title="2. 개인정보 이용 목적">
          수집한 정보는 로그인 상태 유지, 계정별 읽음/즐겨찾기 등 개인화 기능 제공과 서비스 이용 패턴 분석 및
          개선을 위해 이용합니다. 이 목적 외로 사용하지 않습니다.
        </Section>

        <Section title="3. 개인정보 보유 및 이용 기간">
          회원 탈퇴(계정 삭제) 요청 시 계정 정보와 계정별 읽음·즐겨찾기 데이터를 지체 없이 파기합니다.
          Google Analytics 4와 Amplitude의 분석 기록은 브라우저·세션 식별자를 기준으로 별도 보관되며 각 도구의
          보유 기간 설정을 따릅니다. 서비스는 분석 이벤트에 계정 ID를 보내지 않으므로 특정 계정의 분석 기록을
          찾아 삭제하지 못할 수 있습니다.
        </Section>

        <Section title="4. 개인정보의 제3자 제공 및 처리 위탁">
          서비스는 개인정보를 외부에 판매하거나 제공하지 않습니다. 다만 서비스 운영을 위해 아래와 같이 처리를
          위탁하고 있습니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>Supabase, Inc. — 데이터베이스 및 로그인 인증 인프라 호스팅</li>
            <li>Google LLC — Google 계정 로그인(OAuth) 및 Google Analytics 4 이용 분석</li>
            <li>Amplitude, Inc. — 서비스 이용 분석</li>
          </ul>
        </Section>

        <Section title="5. 서비스 이용 분석 도구">
          서비스 개선을 위해 Google Analytics 4와 Amplitude를 사용합니다. 분석 도구는 브라우저·세션 식별자와
          쿠키 또는 브라우저 저장소를 이용해 여러 방문의 이벤트를 같은 브라우저 기준으로 연결할 수 있습니다.
          서비스는 분석 이벤트에 로그인 이메일·이름·계정 ID를 보내지 않습니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>Google Analytics 4: 페이지 방문, 세션 통계와 원문 글 클릭을 기록하며, 원문 클릭에는 공개 글 ID와 제목이 포함됩니다. 기본 수집에는 대략적인 위치와 브라우저·기기 정보가 포함됩니다.</li>
            <li>Amplitude: 페이지 경로, 검색어 길이·단어 수, 검색 결과 수, 선택한 주제, 소스 필터 적용 여부를 기록합니다. SDK에서 IP 주소, 브라우저 언어, 플랫폼 수집은 비활성화했습니다.</li>
            <li>검색어 원문은 분석 이벤트로 보내지 않습니다. 주소의 `q` 검색 매개변수는 Google Analytics 4에서 가려지고 사이트 검색어 자동 측정 대상에서도 제외됩니다.</li>
          </ul>
        </Section>

        <Section title="6. 이용자의 권리">
          이용자는 언제든지 본인의 개인정보 열람, 정정, 삭제를 요청할 수 있습니다. 아래 연락처로 문의해주시면
          지체 없이 조치합니다.
        </Section>

        <Section title="7. 문의처">이메일: {CONTACT_EMAIL}</Section>
      </div>
    </main>
  );
}
