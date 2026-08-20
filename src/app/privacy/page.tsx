import type { Metadata } from "next";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";

const CONTACT_EMAIL = "yijunsuc@gmail.com";
const EFFECTIVE_DATE = "2026년 8월 13일";

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
          Magisa(이하 &ldquo;서비스&rdquo;)는 회원가입 및 로그인 과정에서 아래 정보를 수집합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>이메일/비밀번호로 가입 시: 이메일 주소</li>
            <li>Google 계정으로 로그인 시: 이메일 주소, 이름, 프로필 사진(Google이 제공하는 범위 내)</li>
          </ul>
          또한 서비스 이용 과정에서 아래 정보가 자동으로 생성·저장됩니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>글 읽음 여부, 즐겨찾기 표시 등 이용 기록</li>
          </ul>
        </Section>

        <Section title="2. 개인정보 이용 목적">
          수집한 정보는 로그인 상태 유지, 계정별 읽음/즐겨찾기 등 개인화 기능 제공을 위해서만 이용합니다.
          이용 목적 외로 사용하지 않습니다.
        </Section>

        <Section title="3. 개인정보 보유 및 이용 기간">
          회원 탈퇴(계정 삭제) 요청 시 지체 없이 파기합니다. 별도로 요청하시면 그 이전에도 삭제해드립니다.
        </Section>

        <Section title="4. 개인정보의 제3자 제공 및 처리 위탁">
          서비스는 개인정보를 외부에 판매하거나 제공하지 않습니다. 다만 서비스 운영을 위해 아래와 같이 처리를
          위탁하고 있습니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>Supabase, Inc. — 데이터베이스 및 로그인 인증 인프라 호스팅</li>
            <li>Google LLC — Google 계정 로그인(OAuth) 인증 처리</li>
          </ul>
        </Section>

        <Section title="5. 서비스 이용 분석 도구">
          서비스 개선을 위해 Google Analytics, Amplitude를 통해 페이지 방문·클릭 등 이용 통계를 수집합니다.
          이 통계는 개인을 특정하지 않는 형태로 집계되어 이용됩니다.
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
