import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { SITE_NAME } from "@/app/seo";

const EFFECTIVE_DATE = "2026년 10월 21일";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: `${SITE_NAME} 개인정보 처리방침 및 보호 기준을 안내합니다.`,
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

        <Section title="1. 수집하는 개인정보 항목 및 수집 방법">
          {SITE_NAME}(이하 &ldquo;서비스&rdquo;)는 회원가입 및 로그인 과정에서 아래 정보를 수집합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>이메일/비밀번호로 가입 시: 이메일 주소</li>
            <li>Google 계정으로 로그인 시: 이메일 주소, 이름, 프로필 사진(Google이 제공하는 범위 내)</li>
          </ul>
          또한 서비스 이용 과정에서 아래 이용 기록과 분석 정보가 자동으로 생성·수집됩니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>글 읽음 여부, 즐겨찾기 표시 등 이용 기록</li>
            <li>로그인 사용자가 작성한 제텔카스텐 노트와 노트·기사 사이의 연결 정보</li>
            <li>서비스 세션 유지 및 반복 방문 분석을 위한 브라우저·세션 식별자와 브라우저 저장소 정보</li>
            <li>Google Analytics 4가 수집하는 대략적인 위치, 브라우저·기기 정보 및 브라우저별 client ID</li>
          </ul>
        </Section>

        <Section title="2. 개인정보 수집 및 이용 목적">
          수집한 정보는 아래의 목적을 위해서만 이용합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>회원 식별 및 로그인 상태 유지, 본인 확인</li>
            <li>계정별 읽음 표시, 즐겨찾기 보관, 개인 지식 노트 작성 및 연결 기능 제공</li>
            <li>서비스 이용 패턴 분석, 서비스 개선 및 신규 기능 개발</li>
            <li>AI 요약 기능 제공(2026년 10월 21일 이후 새로 등록되는 글의 본문 추출 요약)</li>
            <li>이용자 문의 및 피드백 응대</li>
          </ul>
        </Section>

        <Section title="3. 개인정보의 보유 및 이용 기간">
          서비스는 원칙적으로 회원 탈퇴 요청 시 또는 개인정보 수집·이용 목적이 달성된 경우 지체 없이 해당 정보를 파기합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>회원 탈퇴 시: 계정 정보, 소셜 연동 정보, 즐겨찾기, 읽음 표시 기록, 작성한 제텔카스텐 노트 및 연결 데이터를 지체 없이 영구 파기합니다.</li>
            <li>Google Analytics 4 및 Amplitude의 분석 기록: 브라우저·세션 식별자를 기준으로 각 도구의 보유 기간 정책에 따라 보관됩니다. 서비스는 분석 이벤트에 개인 식별 정보(이메일, 이름, 계정 ID)를 전송하지 않습니다.</li>
          </ul>
        </Section>

        <Section title="4. 개인정보의 제3자 제공 및 처리 위탁">
          서비스는 원칙적으로 이용자의 개인정보를 외부에 판매하거나 동의 없이 제3자에게 제공하지 않습니다.
          다만 안정적인 서비스 운영을 위해 아래와 같이 전문 인프라에 처리를 위탁하고 있습니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li><strong>Supabase, Inc.</strong>: 데이터베이스 및 로그인 인증 인프라 호스팅</li>
            <li><strong>Pinecone, Inc.</strong>: 공개 기사 제목·요약·주제·태그의 임베딩 생성 및 의미상 관련 기사 검색 (사용자가 작성한 비공개 노트와 연결 내용은 전송하지 않음)</li>
            <li><strong>Google LLC</strong>: Google OAuth 로그인 인증 및 Google Analytics 4 통계 분석</li>
            <li><strong>Amplitude, Inc.</strong>: 서비스 이용 패턴 분석</li>
            <li><strong>OpenAI, LLC</strong>: 신규 등록 기사 요약 시 글 제목과 원문에서 추출한 본문 텍스트 API 전달</li>
          </ul>
        </Section>

        <Section title="5. AI 요약 기능 및 데이터 처리">
          서비스는 기사 요약을 위해 OpenAI API를 활용합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>글 제목과 웹페이지에서 추출한 본문 텍스트만 처리하며, 이용자의 개인정보(이메일, 계정 ID 등)나 검색어는 전송되지 않습니다.</li>
            <li>원문 본문 텍스트는 요약 처리 시에만 일시적으로 사용되며 서비스 데이터베이스에 영구 저장되지 않습니다.</li>
            <li>OpenAI API 정책상 API를 통해 전송된 데이터는 모델 학습에 기본 활용되지 않습니다. 자세한 사항은 OpenAI 데이터 처리 안내를 참고하실 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="6. 개인정보의 파기 절차 및 방법">
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li><strong>파기 절차</strong>: 이용 목적이 달성되거나 탈퇴 요청이 접수된 경우 즉시 파기 대상 데이터베이스에서 영구 삭제됩니다.</li>
            <li><strong>파기 방법</strong>: 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
          </ul>
        </Section>

        <Section title="7. 이용자의 권리와 행사 방법">
          이용자는 언제든지 본인의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요청할 수 있으며, 회원 탈퇴를 요구할 수 있습니다.
          해당 요청은 서비스 내 설정 또는 운영 문의 채널을 통해 언제든지 접수할 수 있으며, 서비스는 지체 없이 필요한 조치를 취합니다.
        </Section>

        <Section title="8. 쿠키 및 자동 수집 장치">
          서비스는 이용자의 편의성 증대, 세션 유지, 통계 분석을 위해 쿠키와 브라우저 로컬 저장소를 사용합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>이용자는 웹 브라우저 옵션 설정을 통해 쿠키 허용 여부를 선택하거나 쿠키 저장을 거부할 수 있습니다.</li>
            <li>Google Analytics 4 및 Amplitude 분석 이벤트에는 로그인 이메일, 실명, 계정 ID와 같은 개인정보를 포함하지 않으며, 주소창의 검색어(q 파라미터) 역시 가려진 상태로 처리됩니다.</li>
          </ul>
        </Section>

        <Section title="9. 개인정보의 안전성 확보 조치">
          서비스는 개인정보의 안전성 확보를 위해 다음과 같은 기술적·관리적 조치를 취하고 있습니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>로그인 세션 및 인증 토큰의 안전한 암호화 전송 및 접근 제어</li>
            <li>관리자 권한에 대한 엄격한 제한 및 접근 통제</li>
            <li>장애 및 비정상 접근 탐지를 위한 보안 모니터링</li>
          </ul>
        </Section>

        <Section title="10. 개인정보 보호책임자 및 문의">
          개인정보 관련 문의, 권리 행사 요청 또는 서비스 이용 중 개인정보 침해 우려가 있는 경우 서비스 운영자에게 문의할 수 있습니다.
          <p style={{ marginTop: 8 }}>
            문의 채널:{" "}
            <Link href="/suggest" style={{ textDecoration: "underline", color: "var(--seed-color-fg-brand, #eb641c)" }}>
              블로그 추천 및 서비스 의견 남기기
            </Link>
          </p>
        </Section>

        <Section title="11. 개인정보처리방침의 변경">
          본 방침은 법령 또는 서비스 운영 정책의 변경에 따라 수정될 수 있습니다. 중요한 내용이 변경되는 경우 서비스 공지사항이나 화면을 통해 사전에 안내합니다.
        </Section>
      </div>
    </main>
  );
}
