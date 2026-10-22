"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Text } from "@seed-design/react";
import { GoogleIcon } from "@/components/google-icon";

const ONBOARDING_DISMISSED_KEY = "techgotgan_onboarding_dismissed";

interface StepData {
  badge: string;
  badgeTone: "brand" | "blue";
  title: string;
  subtitle: string;
  imageSrc: string;
  imageAlt: string;
}

const STEPS: StepData[] = [
  {
    badge: "매일 아침 자동 수집",
    badgeTone: "brand",
    title: "토스·당근·배민의 최신 테크 글을 한곳에서",
    subtitle: "수십 개 기업 기술 블로그를 일일이 찾아다니지 마세요. 검증된 엔지니어링 새 글을 매일 아침 자동으로 큐레이션해 드립니다.",
    imageSrc: "/onboarding/step1-feed.png",
    imageAlt: "토스, 배민, 당근 테크 피드 목록 캡처",
  },
  {
    badge: "AI 3줄 핵심 요약",
    badgeTone: "blue",
    title: "긴 기술 아티클도 1분 만에! AI 핵심 브리핑",
    subtitle: "문제 배경, 기술 스택, 실무 교훈까지 3줄로 명쾌하게 정리했어요. 바쁜 출퇴근길에도 핵심 인사이트만 빠르게 챙겨보세요.",
    imageSrc: "/onboarding/step2-ai-summary.png",
    imageAlt: "AI 엔지니어링 브리핑 요약 화면 캡처",
  },
  {
    badge: "맞춤 서재 & 동기화",
    badgeTone: "brand",
    title: "로그인하고 '안읽은 새 글'만 골라 읽으세요",
    subtitle: "이미 읽은 글은 자동으로 걸러주고, 매일 올라온 미열람 글만 쏙쏙! 즐겨찾기한 글도 모든 기기에서 그대로 보관됩니다.",
    imageSrc: "/onboarding/step3-unread-sync.png",
    imageAlt: "안읽음 필터 및 읽음 상태 동기화 화면 캡처",
  },
];

function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    // 쿠키에도 1년간 보관하여 재방문 시 최초 1회만 표시되도록 보장
    document.cookie = `${ONBOARDING_DISMISSED_KEY}=true; max-age=31536000; path=/; SameSite=Lax`;
  } catch {
    // Storage access fallback
  }
}

function hasSeenOnboarding(): boolean {
  try {
    if (localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true") return true;
    if (document.cookie.includes(`${ONBOARDING_DISMISSED_KEY}=true`)) return true;
  } catch {
    // Fallback
  }
  return false;
}

export function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // 최초 1회 방문 고객에게만 노출
    if (!hasSeenOnboarding()) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = useCallback(() => {
    // 어떤 방식으로 닫든 최초 1회 표시 후 영구 기록하여 다시 뜨지 않도록 처리
    markOnboardingSeen();
    setIsOpen(false);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      } else if (e.key === "ArrowRight") {
        if (currentStep < STEPS.length - 1) setCurrentStep((p) => p + 1);
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) setCurrentStep((p) => p - 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, handleClose]);

  if (!isOpen) return null;

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div
      className="onboarding-backdrop onboarding-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-label="테크곳간 온보딩 안내"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="onboarding-dialog onboarding-dialog-enter">
        {/* 모바일 바텀시트 드래그 핸들 */}
        <div className="onboarding-sheet-handle" aria-hidden="true" />

        {/* 상단 닫기 및 진행 인디케이터 바 */}
        <div className="onboarding-top-bar">
          <div className="onboarding-step-indicator">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`onboarding-step-bar ${i <= currentStep ? "active" : ""}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="onboarding-close-button"
            onClick={handleClose}
            aria-label="온보딩 닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 영역: 가독성 중심 헤더 & 서브타이틀 */}
        <div className="onboarding-main-content">
          <div className="onboarding-text-block">
            <span className={`onboarding-pill-badge onboarding-pill-${step.badgeTone}`}>
              {step.badge}
            </span>
            <Text as="h2" textStyle="t7Bold" color="fg.neutral" className="onboarding-hero-title">
              {step.title}
            </Text>
            <Text as="p" textStyle="t3Regular" color="var(--seed-color-fg-neutral-muted)" className="onboarding-hero-subtitle">
              {step.subtitle}
            </Text>
          </div>

          {/* 선명한 클로즈업 실제 캡처 화면 */}
          <div className="onboarding-screenshot-wrapper">
            <Image
              src={step.imageSrc}
              alt={step.imageAlt}
              width={700}
              height={380}
              priority
              className="onboarding-clean-image"
            />
          </div>
        </div>

        {/* 하단 컨트롤 & 전환 버튼 */}
        <div className="onboarding-bottom-actions">
          {!isLast ? (
            <div className="onboarding-nav-row">
              <button
                type="button"
                onClick={handleClose}
                className="onboarding-skip-button"
              >
                건너뛰기
              </button>

              <div className="onboarding-nav-right">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="onboarding-button-secondary"
                  >
                    이전
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  className="onboarding-button-primary"
                >
                  다음 단계 →
                </button>
              </div>
            </div>
          ) : (
            <div className="onboarding-final-cta-wrapper">
              <Link
                href="/login?intent=signup"
                onClick={handleClose}
                className="onboarding-google-cta"
              >
                <GoogleIcon size={18} />
                <span>Google 1초 시작하기</span>
              </Link>
              <div className="onboarding-final-sub-row">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="onboarding-button-secondary"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="onboarding-button-secondary onboarding-button-flex"
                >
                  바로 둘러보기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
