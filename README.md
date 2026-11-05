# 로드스쿨 RoadSchool - interactive prototype

Voice-first, location-linked learning app concept for the rear seat of a family car.
This is a **web prototype for the Hyundai Motor Group in-vehicle app contest**; it simulates one drive
(서울 잠실 -> 강릉 경포, scripted example speeds, a traffic jam, a rest stop) end to end.

## Run
```
cd roadschool-proto
/opt/homebrew/bin/python3.11 -m http.server 18765 --bind 127.0.0.1     # any static server works
open http://127.0.0.1:18765/index.html          # car display 1920x720 (scales to the window) + simulation panel
```
| URL option | meaning |
|---|---|
| `?view=tablet` | rear-seat tablet layout (touch answers only while parked) |
| `&clean=1` | stage only, no simulation panel (used for screenshots) |
| `&auto=1` | child answers automatically (demo; first answer is wrong on purpose for some questions) |
| `&ts=30` | simulated seconds per real second (default 30) |
| `&mute=1`, `&fast=6` | no browser voice / faster stubbed speech |
| `&autostart=1` | start the trip immediately |
`report.html` = parent report "오늘 배운 지도" (reads the last trip from localStorage; `?demo=1` shows example data).
Press **출발 (sim)** (or Space). In the panel you can override Vehicle speed/gear, jump to a place, type the child's answer
(simulated STT), or switch the view. Tests: `npm test` (node >= 20) - 6 tests: grading and the safety state machine over the whole scripted drive.

## What is simulated (everything under `js/sdk-sim.js`)
All SDK calls are **SIMULATED**; names mirror the SDK families in the contest guide, signatures are prototype assumptions
that must be re-checked against the official Pleos Playground SDK reference before the Android port.

| Prototype class | Pleos SDK family (guide) | Simulated by |
|---|---|---|
| `Vehicle.getSpeedKmh()/getGear()` | Vehicle SDK | scripted drive timeline / panel override |
| `FusedLocation.getLastLocation()` | FusedLocation SDK | interpolated position on approximate waypoints |
| `NaviHelper.getRemainingTimeSec()/getRoutePreview()` | NaviHelper SDK | timeline ETA, next-episode prefetch log |
| `TextToSpeech.speak()/stop()` | TextToSpeech SDK | browser `speechSynthesis` (ko-KR) or timed stub, sentence by sentence |
| `SpeechToText.startListening()` | SpeechToText SDK | panel input / auto-child / rear tap (no real recognition) |
Every call appears in the "SDK calls (all SIMULATED)" log with a `[SIM ...]` tag. Speeds, the traffic jam, the rest stop,
ETA (~2h50m including a 10-minute stop) are **example values, not measured data**; waypoint coordinates are approximate and the map
is schematic (coast/river/ridge simplified, not survey-accurate).

## Features covered
1. **지금 지나는 곳 수업** - an episode fires when the (simulated) position enters a place radius while heading east; missed places are skipped and the story continues.
2. **캐릭터 음성 + 아이 대답** - 로드쌤 speaks (TTS), asks a question, child answers (simulated STT), grading with synonym/pronunciation candidates,
   "다시 말해 줄래요?" retry, hint on the first miss, gentle reveal after the second, wrong ones go to "다시 볼 질문".
3. **3-level safety state machine** (`js/safety.js`): `STOPPED` (gear P and 0 km/h only) / `LOW` (slow, or stopped but not in P) / `DRIVING`.
   Visuals only in `STOPPED`; `LOW` blocks new questions and only finishes the story; hysteresis 25/35 km/h. A runtime invariant
   check (`data-visual` elements must not exist unless STOPPED) is shown in the panel. Never addresses the driver.
4. **ETA-fitted length** - tier chosen from time until the next place / arrival: 3분형 / 7분형 / 15분형 (the prototype plays shortened sample beats of each tier).
5. **도착까지 남은 미션 3개** - 한강 따라가기 / 산을 넘는 길 / 바다 도착 전 퀴즈; arrival-preview question about 오죽헌.
6. **부모용 리포트** - route map with stars, what was learned, correct/hint/review per question, one field-trip suggestion.

## Content notes
8 episodes (3 missions). Curriculum tags are **loose area labels** (2022 개정 교육과정 초등 사회·과학 영역 연계 예시), not exact 성취기준 codes.
No statistics are used. Facts used: 한강 발원지 검룡소(태백), 남한강+북한강이 양평 두물머리에서 합류, 한강은 서해로 흐름, 평창 2018 동계올림픽 / 스케이트·아이스하키·컬링은 강릉,
대관령은 태백산맥의 고개(영서/영동), 서해 갯벌 vs 동해 모래 해변(조수 간만 차), 경포호 = 석호, 오죽헌 = 율곡 이이 출생지, 영릉(여주) = 세종대왕릉.
Child voice is never stored in the design; the prototype stores only result text in `localStorage` for the report demo.
