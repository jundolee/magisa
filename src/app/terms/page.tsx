import type { Metadata } from "next";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { PageHeader } from "@/components/page-header";
import { SITE_NAME } from "@/app/seo";

const EFFECTIVE_DATE = "2026년 10월 22일";

export const metadata: Metadata = {
  title: "이용약관",
  description: `${SITE_NAME} 서비스 이용 조건, 권리와 의무, 책임 사항을 안내합니다.`,
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

export default function TermsPage() {
  return (
    <main>
      <PageHeader />

      <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 12 }}>
        <div>
          <Text as="h1" textStyle="t7Bold" color="fg.neutral">
            이용약관
          </Text>
          <Text as="p" textStyle="t2Regular" color="var(--seed-color-fg-neutral-muted)" style={{ marginTop: 8 }}>
            시행일자: {EFFECTIVE_DATE}
          </Text>
        </div>

        <Section title="1. 목적">
          본 약관은 {SITE_NAME}(이하 &ldquo;서비스&rdquo;)가 제공하는 웹사이트 및 관련 제반 기능의 이용 조건,
          이용자와 서비스 운영자 간의 권리·의무 및 책임 사항을 규정함을 목적으로 합니다.
        </Section>

        <Section title="2. 용어의 정의">
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li><strong>서비스</strong>: {SITE_NAME}이 제공하는 기술 블로그 게시글 탐색, 검색, 추천, 즐겨찾기, 읽음 표시, AI 요약 등의 제반 기능을 의미합니다.</li>
            <li><strong>이용자</strong>: 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li><strong>회원</strong>: 이메일 또는 소셜 로그인(Google 등)을 통해 계정을 생성하고 서비스를 이용하는 자를 말합니다.</li>
            <li><strong>게시글</strong>: 외부 기업 및 엔지니어링 블로그에서 수집된 제목, 요약, 태그, 원문 링크 등의 메타정보를 의미합니다.</li>
          </ul>
        </Section>

        <Section title="3. 약관의 효력 및 변경">
          본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다. 서비스는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며,
          약관이 개정되는 경우 적용일자 및 개정 사유를 명시하여 서비스 내에 공지합니다.
        </Section>

        <Section title="4. 회원가입 및 계정 관리">
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>이용자는 소셜 로그인 또는 이메일 인증을 통해 회원으로 가입할 수 있습니다.</li>
            <li>회원은 본인의 계정 정보를 안전하게 관리해야 하며, 제3자에게 양도하거나 대여할 수 없습니다.</li>
            <li>서비스는 만 14세 미만 아동에 대한 별도의 법정대리인 동의 절차를 운영하지 않으므로 만 14세 미만 아동의 회원가입을 제한할 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="5. 서비스의 내용 및 제공">
          서비스는 다음과 같은 기능을 제공합니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>국내외 IT 기업 및 기술 블로그 게시글 메타정보(제목, 요약, 카테고리, 발행일 등) 및 원문 링크 제공</li>
            <li>게시글 검색, 주제별 탐색, 블로그 목록, 주간 다이제스트, RSS 피드 제공</li>
            <li>회원 전용 기능: 글 읽음 표시와 즐겨찾기 보관</li>
            <li>OpenAI API 기반 신규 등록 기사 본문 자동 요약 제공</li>
          </ul>
        </Section>

        <Section title="6. 이용자의 의무 및 금지사항">
          이용자는 다음 각 호의 행위를 하여서는 안 됩니다.
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>타인의 계정 정보나 개인정보를 도용하는 행위</li>
            <li>서비스의 정상적인 운영을 방해하거나 시스템에 과도한 부하를 유발하는 자동화 도구(매크로, 스크래퍼 등)의 무단 사용 행위</li>
            <li>서비스 내 제공되는 콘텐츠나 시스템 구조를 무단 복제, 배포, 변형하는 행위</li>
            <li>기타 관련 법령 및 공서양속에 반하는 행위</li>
          </ul>
        </Section>

        <Section title="7. 원문 콘텐츠 및 외부 링크에 대한 권리와 책임">
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>서비스에서 수집·제공하는 기술 블로그 게시글의 원문 저작권 및 모든 지식재산권은 해당 원문 작성자 및 원문 발행사에 귀속됩니다.</li>
            <li>서비스는 정보 탐색 편의를 위한 메타정보 및 원문 링크만을 제공하며, 원문 페이지의 내용, 신뢰성, 지속성 또는 변경·삭제에 대하여 책임을 지지 않습니다.</li>
          </ul>
        </Section>

        <Section title="8. AI 요약 기능 안내">
          서비스는 편의를 돕기 위해 인공지능(AI)을 활용한 기사 본문 요약 기능을 제공할 수 있습니다.
          AI가 생성한 요약은 원문 본문의 일부 맥락을 기계적으로 압축한 것이며 오류나 왜곡이 포함될 수 있으므로, 정확하고 완전한 기술 내용은 반드시 원문 글을 직접 확인하시기 바랍니다.
        </Section>

        <Section title="9. 서비스의 변경, 중단 및 종료">
          서비스는 시스템 점검, 교체, 장애, 통신 두절, 원문 사이트 정책 변경 등 운영상 상당한 이유가 있는 경우 서비스의 전부 또는 일부를 변경하거나 일시 중단할 수 있습니다.
          무료로 제공되는 서비스의 특성상 불가피한 중단이나 변경에 대해 관련 법령에 특별한 규정이 없는 한 별도의 보상을 제공하지 않습니다.
        </Section>

        <Section title="10. 이용 제한 및 회원 탈퇴">
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>회원은 언제든지 서비스 내에서 회원 탈퇴를 요청할 수 있으며, 탈퇴 시 회원의 개인정보와 개인 데이터는 개인정보처리방침에 따라 처리됩니다.</li>
            <li>회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 서비스는 사전 통보 없이 계정 이용을 일시적 또는 영구적으로 제한할 수 있습니다.</li>
          </ul>
        </Section>

        <Section title="11. 책임의 제한">
          <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
            <li>서비스는 천재지변, 외부 클라우드 및 API 장애 등 합리적인 통제 범위를 벗어난 사유로 서비스를 제공할 수 없는 경우 책임을 지지 않습니다.</li>
            <li>서비스는 이용자가 서비스를 이용하여 기대하는 수익이나 결과를 얻지 못하거나 상실한 것에 대하여 책임을 지지 않습니다.</li>
          </ul>
        </Section>

        <Section title="12. 문의">
          서비스 이용 조건, 권리 침해 신고, 기타 문의 사항은 서비스 내 운영 문의 채널을 통해 접수할 수 있습니다.
          <p style={{ marginTop: 8 }}>
            문의 채널:{" "}
            <Link href="/suggest" style={{ textDecoration: "underline", color: "var(--seed-color-fg-brand, #eb641c)" }}>
              블로그 추천 및 서비스 의견 남기기
            </Link>
          </p>
        </Section>

        <Section title="13. 준거법 및 관할">
          본 약관은 대한민국 법령에 따라 규율되고 해석되며, 서비스 이용과 관련하여 분쟁이 발생할 경우 대한민국 법령에 따른 관할 법원에 따릅니다.
        </Section>
      </div>
    </main>
  );
}
