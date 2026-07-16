import { useEffect, useRef, useState } from "react";
import { INTERESTS, SPLASH_DECO } from "../lib/data.js";
import { robotHead } from "../lib/mascot.js";
import GateDialog from "../components/GateDialog.jsx";
import { computeAge, ageModeForAge, MODE_LABEL, CHILD_MIN } from "../lib/age.js";

const NOW = new Date();
const CUR_YEAR = NOW.getFullYear();
// 만 0~13세에 해당하는 출생연도 (최신순)
const BIRTH_YEARS = Array.from({ length: 14 }, (_, i) => CUR_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

function ageNote(age) {
  const mode = ageModeForAge(age);
  if (mode === "young")
    return {
      title: `만 ${age}살 · 영유아 모드`,
      body: "이른 읽기와 그림·놀이 중심의 짧고 안전한 활동에 딱 맞아요.",
    };
  return {
    title: `만 ${age}살 · 아동 모드`,
    body: "읽기·간단한 셈과 궁금증을 스스로 탐구하도록 맞춰 줄게요.",
  };
}

// 최초 실행 1회 — 부모가 진행하는 초기 설정(회원가입) 흐름
export default function Onboarding({ onDone }) {
  const [step, setStep] = useState("name"); // name|age|interests|safety|loading|paywall
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState(null);
  const [birthMonth, setBirthMonth] = useState(null);
  const [interests, setInterests] = useState([]);
  // 생년월로 만 나이를 계산 (생일이 지났는지는 월까지만 보고 근사)
  const age = birthYear ? computeAge({ birthYear, birthMonth }, NOW) : null;
  const [plan, setPlan] = useState("yearly"); // yearly | monthly
  const [gate, setGate] = useState(null);
  const [loadStep, setLoadStep] = useState(0);
  const nameRef = useRef(null);

  const who = name.trim() || "우리 아이";
  const STEPS = ["name", "age", "interests", "safety"];
  const progress = (STEPS.indexOf(step) + 1) / STEPS.length;

  useEffect(() => {
    if (step === "name" && nameRef.current) nameRef.current.focus();
  }, [step]);

  // "경험 준비 중" 로딩 — 체크리스트 순차 표시 후 페이월로
  useEffect(() => {
    if (step !== "loading") return;
    setLoadStep(0);
    const t1 = setTimeout(() => setLoadStep(1), 800);
    const t2 = setTimeout(() => setLoadStep(2), 1700);
    const t3 = setTimeout(() => setLoadStep(3), 2600);
    const t4 = setTimeout(() => setStep("paywall"), 3300);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [step]);

  function toggleInterest(id) {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function finish(chosenPlan) {
    onDone({
      onboarded: true,
      name: name.trim(),
      birthYear,
      birthMonth,
      age, // 저장 시점의 만 나이(생년월 기준으로 앱에서 다시 계산됨)
      interests,
      plan: chosenPlan,
    });
  }

  function back() {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  }

  const LOAD_ITEMS = [
    "연령에 맞는 콘텐츠 준비",
    "안전 기능 설정",
    "학습 주제 준비",
  ];

  // ── 로딩 화면 ──
  if (step === "loading") {
    return (
      <section className="ob ob-loading">
        <span
          className="ob-load-robot"
          dangerouslySetInnerHTML={{ __html: robotHead("excited") }}
        />
        <h1>
          {who}의 경험을
          <br />
          만들고 있어요…
        </h1>
        <div className="ob-load-list">
          {LOAD_ITEMS.map((label, i) => (
            <div key={i} className={`ob-load-item ${loadStep > i ? "done" : ""}`}>
              <div className="ob-load-row">
                <span>{label}</span>
                <span className="ob-load-check">{loadStep > i ? "✓" : ""}</span>
              </div>
              <div className="ob-load-bar">
                <i style={{ width: loadStep > i ? "100%" : "0%" }} />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // ── 페이월 ──
  if (step === "paywall") {
    const plans = {
      yearly: { price: "₩39,000", per: "월 ₩3,250 꼴", tag: "₩19,800 절약" },
      monthly: { price: "₩4,900", per: "매월 청구", tag: "" },
    };
    return (
      <section className="ob ob-paywall">
        <div className="ob-pw-scroll">
          <button
            className="ob-pw-close"
            onClick={() => finish("free")}
            aria-label="닫기"
          >
            ✕
          </button>

          <div className="ob-pw-banner">
            <span
              className="ob-pw-deco"
              dangerouslySetInnerHTML={{ __html: SPLASH_DECO }}
            />
            <span
              className="ob-pw-robot"
              dangerouslySetInnerHTML={{ __html: robotHead("love") }}
            />
          </div>

          <h1 className="ob-pw-title">
            {who}에게 반짝톡을
            <br />
            마음껏 선물하세요
          </h1>
          <p className="ob-pw-sub">
            안전한 AI 음성 대화와 그림 만들기, 그리고 부모 대시보드 전체 이용.
          </p>

          <div className="ob-pw-feats">
            {[
              "무제한 질문 — 안전하게 무엇이든 탐구",
              "매주 100분 음성 대화",
              "매주 50장 상상 그림 만들기",
              "음성 대화 기록 · 부모 열람",
            ].map((f, i) => (
              <div key={i} className="ob-pw-feat">
                <span className="ob-pw-fcheck">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>

          <div className="ob-pw-plans">
            {["yearly", "monthly"].map((p) => (
              <button
                key={p}
                className={`ob-plan ${plan === p ? "on" : ""}`}
                onClick={() => setPlan(p)}
              >
                {plans[p].tag && <span className="ob-plan-tag">{plans[p].tag}</span>}
                {plan === p && <span className="ob-plan-check">✓</span>}
                <b className="ob-plan-name">{p === "yearly" ? "연간" : "월간"}</b>
                <span className="ob-plan-price">{plans[p].price}</span>
                <span className="ob-plan-per">{plans[p].per}</span>
              </button>
            ))}
          </div>

          <div className="ob-pw-trust">
            <div className="ob-pw-stars">★★★★★</div>
            <p className="ob-pw-rating">
              <b>4.8</b> · 부모 후기 평점
            </p>
            <div className="ob-pw-review">
              "책이 지루하다던 아이가 이제 '5분만 더' 하며 반짝톡을 찾아요."
              <span>— 어느 부모님</span>
            </div>
          </div>

          <div className="ob-pw-faq">
            <h3>자주 묻는 질문</h3>
            <details>
              <summary>아이 활동을 볼 수 있나요?</summary>
              <p>
                네. 부모 존 대시보드에서 대화 기록·만든 그림·음성 대화 기록을
                모두 확인할 수 있어요.
              </p>
            </details>
            <details>
              <summary>안전한가요?</summary>
              <p>
                모든 메시지가 안전 필터를 거치고, AI는 활동 범위 안에서만
                도와줘요. 개방형 자유 대화·광고·아이 대면 결제는 없습니다.
              </p>
            </details>
            <details>
              <summary>구독은 어떻게 해지하나요?</summary>
              <p>언제든지 해지할 수 있어요. 숨은 비용이나 복잡한 절차가 없습니다.</p>
            </details>
          </div>
        </div>

        <div className="ob-pw-cta">
          <button
            className="ob-primary crown"
            onClick={() =>
              setGate({
                a: 3 + Math.floor(Math.random() * 8),
                b: 4 + Math.floor(Math.random() * 8),
              })
            }
          >
            👑 구독 시작하기
          </button>
          <button className="ob-pw-free" onClick={() => finish("free")}>
            무료로 계속하기 (제한적 사용)
          </button>
          <p className="ob-pw-note">약정 없이 언제든 해지할 수 있어요.</p>
        </div>

        {gate && (
          <GateDialog
            a={gate.a}
            b={gate.b}
            onPass={() => {
              setGate(null);
              finish(plan);
            }}
            onClose={() => setGate(null)}
          />
        )}
      </section>
    );
  }

  // ── 스텝 화면 (name/age/interests/safety) ──
  const canNext =
    (step === "name" && name.trim().length > 0) ||
    (step === "age" && birthYear != null) ||
    (step === "interests" && interests.length > 0) ||
    step === "safety";

  function next() {
    if (!canNext) return;
    if (step === "name") setStep("age");
    else if (step === "age") setStep("interests");
    else if (step === "interests") setStep("safety");
    else if (step === "safety") setStep("loading");
  }

  return (
    <section className="ob ob-step">
      <header className="ob-top">
        <button
          className="ob-back"
          onClick={back}
          aria-label="뒤로"
          style={{ visibility: step === "name" ? "hidden" : "visible" }}
        >
          ‹
        </button>
        <div className="ob-progress">
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      </header>

      <div className="ob-body">
        {step === "name" && (
          <>
            <h1>아이 이름이 뭐예요?</h1>
            <p className="ob-sub">이름에 맞춰 모두 준비해 둘게요</p>
            <div className="ob-field">
              <label>이름</label>
              <input
                ref={nameRef}
                type="text"
                maxLength={20}
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) next();
                }}
                placeholder="예: 아라"
              />
            </div>
          </>
        )}

        {step === "age" && (
          <>
            <h1>{who}는 언제 태어났어요?</h1>
            <p className="ob-sub">
              생일에 맞춰 나이와 모드를 자동으로 맞춰 드려요
            </p>
            <div className="ob-birth">
              <label className="ob-field">
                <span>태어난 해</span>
                <select
                  value={birthYear ?? ""}
                  onChange={(e) =>
                    setBirthYear(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                >
                  <option value="" disabled>
                    선택
                  </option>
                  {BIRTH_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}년 (만 {CUR_YEAR - y}살 무렵)
                    </option>
                  ))}
                </select>
              </label>
              <label className="ob-field">
                <span>태어난 달</span>
                <select
                  value={birthMonth ?? ""}
                  onChange={(e) =>
                    setBirthMonth(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                >
                  <option value="">모름</option>
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}월
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {age != null && (
              <div className="ob-age-note">
                <span className="ob-age-check">✓</span>
                <div>
                  <b>{ageNote(age).title}</b>
                  <p>{ageNote(age).body}</p>
                  {age < CHILD_MIN && (
                    <p className="ob-age-switch">
                      만 {CHILD_MIN}세가 되면 아동({MODE_LABEL.kid.range}) 모드로
                      자동 전환돼요.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {step === "interests" && (
          <>
            <h1>{who}는 무엇을 좋아하나요?</h1>
            <p className="ob-sub">원하는 만큼 골라 주세요</p>
            <div className="ob-chips">
              {INTERESTS.map((it) => (
                <button
                  key={it.id}
                  className={`ob-chip ${interests.includes(it.id) ? "on" : ""}`}
                  onClick={() => toggleInterest(it.id)}
                >
                  <span>{it.emoji}</span> {it.label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "safety" && (
          <>
            <h1>{who}의 안전이 가장 중요해요</h1>
            <p className="ob-sub">안전을 최우선으로 설계했어요</p>
            <div className="ob-safe-cards">
              {[
                {
                  icon: "🛡️",
                  text: "100% 광고 없이, 안심하고 맡길 수 있는 안전한 놀이 공간",
                },
                {
                  icon: "🔒",
                  text: "대화·음성 기록·그림을 부모가 모두 열람 — 완전한 투명성",
                },
                {
                  icon: "🎙️",
                  text: "개인정보 최소 수집, 부모 인증 게이트, 콘텐츠 필터 상시 작동",
                },
              ].map((c, i) => (
                <div key={i} className="ob-safe-card">
                  <span className="ob-safe-icon">{c.icon}</span>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
            <div className="ob-rating">
              <span className="ob-rating-num">4.8</span>
              <span className="ob-rating-sub">부모 후기 평균 평점</span>
            </div>
          </>
        )}
      </div>

      <div className="ob-cta">
        <button className="ob-primary" onClick={next} disabled={!canNext}>
          {step === "safety" ? "시작하기" : "다음"}
        </button>
      </div>
    </section>
  );
}
