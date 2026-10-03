"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MyakaFace, type MyakaExpression } from "@/components/myaka-face";
import { MyakaScene } from "@/components/myaka-scene";

const moods = [
  { id: "slow", label: "Спокойный", line: "Никуда не спешу.", note: "Нашёл тёплое место. Остальное подождёт.", color: "#b8b79f" },
  { id: "curious", label: "Любопытный", line: "Что это у тебя?", note: "Пакет шуршит, дверь открылась — надо посмотреть.", color: "#d7bfa0" },
  { id: "wild", label: "С характером", line: "Я сам.", note: "Позвали — не пришёл. Перестали звать — пришёл.", color: "#b8ad95" },
];

const stories = [
  { scene: "nap" as const, title: "Ещё пять минут", text: "Будильник прозвенел. Мяка перевернулся на другой бок." },
  { scene: "box" as const, title: "Что-то шуршит", text: "Коробка пустая. Но это ещё нужно проверить." },
  { scene: "chair" as const, title: "Место занято", text: "Ты встал за чаем. Мяка уже устроился." },
];

const telegramUrl = "https://t.me/RostorVLasov";

function Cat({ className = "" }: { className?: string }) {
  return <img className={className} src="/images/myaka.svg" alt="" width="1158" height="598" draggable="false" />;
}

export default function Home() {
  const [petting, setPetting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mood, setMood] = useState<MyakaExpression>("slow");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    root.current?.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => { observer.disconnect(); if (timer.current) clearTimeout(timer.current); };
  }, []);

  function strokeCat() {
    if (timer.current) clearTimeout(timer.current);
    setPetting(true);
    timer.current = setTimeout(() => setPetting(false), 2600);
  }

  function petCat() {
    strokeCat();
  }

  const currentMood = moods.find((item) => item.id === mood) ?? moods[0];

  return (
    <div ref={root}>
      <a className="skip-link" href="#about">К содержимому</a>
      <div className="hero-shell" id="top">
        <header className="header">
          <a className="wordmark" href="#top" aria-label="Мяка, на главную"><Cat /><span>Мяка</span></a>
          <nav className={`navigation ${menuOpen ? "open" : ""}`} aria-label="Основная навигация" id="main-navigation">
            <a href="#about" onClick={() => setMenuOpen(false)}>Это Мяка</a>
            <a href="#mood" onClick={() => setMenuOpen(false)}>Настроение</a>
            <a href="#little-things" onClick={() => setMenuOpen(false)}>Фотографии</a>
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Telegram</a>
          </nav>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="main-navigation" aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}>{menuOpen ? <X /> : <Menu />}</button>
        </header>

        <div className="hero-main">
          <div className="hero-copy">
            <h1>Привет.<br />Я <span className="name-underline">Мяка.</span></h1>
            <p className="hero-description">Кот из маленьких историй про обычную жизнь.<br />Спит где удобно. Проверяет каждую коробку.</p>
            <a className="paper-button" href="#about">Познакомиться</a>
          </div>
          <div className={`cat-stage ${petting ? "is-petting" : ""}`}>
            <div className="cat-paper" aria-hidden="true" />
            <button className="cat-touch" onClick={petCat} onPointerDown={() => strokeCat()}
              onPointerMove={(event) => { if (event.buttons === 1) strokeCat(); }} aria-label="Погладить Мяку">
              <MyakaFace expression={petting ? "happy" : mood} className="hero-cat" />
            </button>
            <span className={`purr ${petting ? "show" : ""}`} aria-live="polite">{petting ? "мррр…" : ""}</span>
            <button className="pet-label" onClick={petCat}>Погладить</button>
          </div>
        </div>
      </div>

      <main>
      <section className="about section-pad" id="about" aria-labelledby="about-title">
        <div className="about-intro">
          <figure className="origin-photo photo-slot reveal">
            <div className="paper-photo">
              <span className="tape" aria-hidden="true" />
              <div className="origin-window"><img src="/images/myaka-sketches.jpg" width="1151" height="2047" loading="lazy" alt="Исходные рисунки Мяки ручкой в тетради: кот с разными выражениями и маленькими историями" /></div>
            </div>
            <figcaption>Мяка в тетради.</figcaption>
          </figure>
          <div className="about-text reveal">
            <h2 id="about-title">Кот, в котором<br />узнаёшь себя.</h2>
            <div className="about-copy">
              <p>Мяка — рисованный кот и герой маленьких историй о повседневной жизни. Сон, любопытство, упрямство — в его кошачьих делах легко узнать себя.</p>
              <p>Всё началось с рисунков ручкой в тетради. Из этих зарисовок и вырос Мяка со своим характером.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="day-section section-pad" id="day" aria-labelledby="day-title">
        <h2 className="reveal" id="day-title">Один день Мяки</h2>
        <div className="story-grid">
          {stories.map((story) => <article className={`story story-${story.scene} reveal`} key={story.scene}>
            <MyakaScene scene={story.scene} />
            <div className="story-copy"><h3>{story.title}</h3><p>{story.text}</p></div>
          </article>)}
        </div>
      </section>

      <section className="mood-section section-pad" id="mood" aria-labelledby="mood-title" style={{ backgroundColor: currentMood.color }}>
        <div className="mood-heading reveal"><h2 id="mood-title">Мяка сегодня</h2></div>
        <Tabs value={mood} onValueChange={(value) => setMood(value as MyakaExpression)} className="mood-tabs reveal">
          <TabsList className="mood-list" variant="line" aria-label="Выбрать настроение">
            {moods.map((item) => <TabsTrigger className="mood-trigger" key={item.id} value={item.id}>{item.label}</TabsTrigger>)}
          </TabsList>
          {moods.map((item) => <TabsContent className="mood-panel" key={item.id} value={item.id}>
            <div className="mood-words"><h3>{item.line}</h3><p>{item.note}</p></div>
            <div className={`mood-stamp mood-${item.id} ${petting ? "is-petting" : ""}`}>
              <button className="mood-pet" onClick={petCat} onPointerDown={() => strokeCat()}
                onPointerMove={(event) => { if (event.buttons === 1) strokeCat(); }} aria-label="Погладить Мяку в настроении">
                <MyakaFace expression={petting ? "happy" : item.id as MyakaExpression} />
              </button>
              <span aria-live="polite">{petting ? "мррр…" : ""}</span>
            </div>
          </TabsContent>)}
        </Tabs>
      </section>

      <section className="little-things section-pad" id="little-things" aria-labelledby="things-title">
        <div className="things-heading reveal"><h2 id="things-title">Мяка на вещах</h2></div>
        <div className="photo-layout">
          <div className="photo-slot photo-one reveal">
          <figure className="paper-photo">
            <span className="tape" aria-hidden="true" />
            <div className="photo-window"><img src="/images/paper.webp" alt="Эскиз айдентики Мяки: кот на обложке блокнота среди бумаги и карандашей" width="1536" height="1024" loading="lazy" /></div>
          </figure>
          </div>
          <div className="photo-slot photo-two reveal">
          <figure className="paper-photo">
            <span className="tape" aria-hidden="true" />
            <div className="photo-window"><img src="/images/cup.webp" alt="Эскиз айдентики Мяки: керамическая кружка с котом в тёплом солнечном свете" width="1536" height="1024" loading="lazy" /></div>
          </figure>
          </div>
        </div>
      </section>
      </main>

      <footer className="footer section-pad">
        <div className="footer-message">
          <Cat />
          <div className="footer-actions">
            <a className="paper-button" href={telegramUrl} target="_blank" rel="noopener noreferrer">Написать в Telegram</a>
            <a className="paper-button secondary-button" href="#top">Ещё немного Мяки</a>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-credits">
            <p>Художник и создатель: Сора.</p>
            <p>Разработка сайта и основной владелец персонажа: <a href="https://RumIsCola.ru" target="_blank" rel="noopener noreferrer">Студия Велром RumIsCola.ru</a></p>
          </div>
          <span>Мяка © 2026</span>
        </div>
      </footer>
    </div>
  );
}
