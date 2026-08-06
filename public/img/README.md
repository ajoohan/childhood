# 이미지 에셋 넣는 곳 (public/img/)

이 폴더에 아래 이름 그대로 PNG를 넣으면 홈 화면에 자동 반영됩니다.
파일이 없으면 이모지/기본 아이콘으로 자동 폴백돼요.

## 규격 (공통)
- 형식: PNG (배경 투명 권장 — 아이콘/마스코트/크라운/아바타)
  - 카드 사진(act-*)은 꽉 찬 사각형이라 배경 있어도 OK
- 해상도: 표시 크기의 2~3배 (레티나). 아래 권장 크기는 @3x 기준
- 색공간: sRGB

## 필요한 파일 목록

### 큰 타일 아이콘 (투명 PNG, ~168×168)
- tile-story.png   (3D 말풍선)
- tile-heart.png   (3D 하트)

### 추천/놀이 카드 이미지 (꽉 찬 사각형, ~360×300, 세로형)
파일명 = act-{활동ID}.png
- act-story_listen.png   (동화 들어요)
- act-story_make.png     (이야기 만들기)
- act-learn_hangul.png   (한글 배우기)
- act-learn_english.png  (영어 놀이)
- act-learn_ask.png      (궁금한 거 물어봐요)
- act-learn_homework.png (숙제 도움)
- act-draw_idea.png      (그림 놀이)
- act-feel_talk.png      (기분 이야기)
- act-habit_routine.png  (생활습관)

### 마스코트 / 장식 (투명 PNG)
- mascot.png   (추천 옆 로봇, ~180×180)
- crown.png    (프리미엄 배너 왕관, ~120×120)

### 프로필 아바타 (선택, 투명 또는 원형, ~168×168)
파일명 = avatar-{이모지}.png  또는  avatar-default.png
예) 현재 아바타가 🦊면 avatar-🦊.png
(주기 어려우면 avatar-default.png 하나만 줘도 모든 아이에게 적용)
