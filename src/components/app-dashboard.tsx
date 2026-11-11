"use client";

import Link from "next/link";
import {
  ArrowDownUp,
  ArrowRight,
  Bell,
  Bookmark,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  Heart,
  Menu,
  MessageCircle,
  Moon,
  Search,
  Sparkles,
  Sun,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import type { FeedPost } from "@/lib/types";

const filters = ["Усі", "Підслухано", "Навчання", "Питання"];
const sortOptions = ["Найновіші", "Популярні", "Обговорюють"] as const;
type SortOption = (typeof sortOptions)[number];
type Language = "uk" | "ru" | "en";

const translations = {
  uk: {
    campus: "ТВІЙ КАМПУС, ТВОЇ ЛЮДИ",
    navFeed: "Стрічка",
    navCommunity: "Спільнота",
    navAbout: "Про проєкт",
    welcome: "Привіт, студенте 👋",
    welcomeCopy: "Тут починається все, про що говорить твій кампус.",
    communityTitle: "Твій кампус. Твоя історія.",
    communityDescription: "Знайомся, ділися думками й залишайся на зв’язку з тими, хто поруч.",
    join: "Приєднатися до спільноти",
    feedTitle: "Стрічка спільноти",
    feedSubtitle: "Думки, новини й маленькі моменти з життя кампусу.",
  },
  ru: {
    campus: "ТВОЙ КАМПУС, ТВОИ ЛЮДИ",
    navFeed: "Лента",
    navCommunity: "Сообщество",
    navAbout: "О проекте",
    welcome: "Привет, студент 👋",
    welcomeCopy: "Здесь начинается всё, о чём говорит твой кампус.",
    communityTitle: "Твой кампус. Твоя история.",
    communityDescription: "Знакомься, делись мыслями и оставайся на связи с теми, кто рядом.",
    join: "Присоединиться к сообществу",
    feedTitle: "Лента сообщества",
    feedSubtitle: "Мысли, новости и мелочи студенческой жизни.",
  },
  en: {
    campus: "YOUR CAMPUS, YOUR PEOPLE",
    navFeed: "Feed",
    navCommunity: "Community",
    navAbout: "About",
    welcome: "Hello, student 👋",
    welcomeCopy: "This is where your campus story begins.",
    communityTitle: "Your campus. Your story.",
    communityDescription: "Meet people, share ideas and stay connected to the community around you.",
    join: "Join the community",
    feedTitle: "Community feed",
    feedSubtitle: "Thoughts, news and everyday moments from campus life.",
  },
} as const;

export function AppDashboard({
  demoMode,
  posts,
}: {
  demoMode: boolean;
  posts: FeedPost[];
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const [activeFilter, setActiveFilter] = useState("Усі");
  const [sortBy, setSortBy] = useState<SortOption>("Найновіші");
  const [search, setSearch] = useState("");
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("ru");
  const searchInput = useRef<HTMLInputElement>(null);
  const text = translations[language];

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("zieit-language") as Language | null;
    if (savedLanguage && savedLanguage in translations) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("zieit-language", language);
  }, [language]);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("uk");
    const filtered = posts.filter((post) => {
      const matchesCategory =
        activeFilter === "Усі" || post.category === activeFilter;
      const matchesSearch =
        !query ||
        `${post.content} ${post.author} ${post.category}`
          .toLocaleLowerCase("uk")
          .includes(query);
      return matchesCategory && matchesSearch;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "Популярні") return b.likes - a.likes;
      if (sortBy === "Обговорюють") return b.comments - a.comments;
      return posts.indexOf(a) - posts.indexOf(b);
    });
  }, [activeFilter, posts, search, sortBy]);

  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    window.localStorage.setItem("zieit-theme", isDark ? "dark" : "light");
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <Brand />
          <button
            aria-label="Закрити меню"
            className="icon-button mobile-close"
            onClick={() => setMenuOpen(false)}
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <div className="campus-label">{text.campus}</div>
        <nav aria-label="Головна навігація" className="main-nav">
          <Link className="nav-link nav-link-active" href="/feed">
            <Compass size={18} />
            <span>{text.navFeed}</span>
            <span className="nav-pulse" />
          </Link>
          <Link className="nav-link" href="/chat">
            <MessageCircle size={18} />
            <span>Чат</span>
          </Link>
          <Link className="nav-link" href="/marketplace">
            <ArrowDownUp size={18} />
            <span>Барахолка</span>
          </Link>
          <Link className="nav-link" href="/channel">
            <Bell size={18} />
            <span>Канал</span>
          </Link>
          <Link className="nav-link" href="/profile">
            <UsersRound size={18} />
            <span>Профіль</span>
          </Link>
          <a className="nav-link" href="#about">
            <CircleHelp size={18} />
            <span>{text.navAbout}</span>
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon">
              <Sparkles size={16} />
            </span>
            <p>Тут можна бути собою — і навіть трохи анонімним.</p>
            <a href="#about">
              Дізнатися більше <ArrowRight size={14} />
            </a>
          </div>
          <div className="sidebar-footer">
            <span className="online-dot" />
            <span>Студентська спільнота ЗІЕІТ</span>
          </div>
        </div>
      </aside>

      {menuOpen && (
        <button
          aria-label="Закрити меню"
          className="mobile-backdrop"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              aria-label="Відкрити меню"
              className="icon-button mobile-menu"
              onClick={() => setMenuOpen(true)}
              type="button"
            >
              <Menu size={20} />
            </button>
            <span className="topbar-context">
              ЗІЕІТ <span>/</span> Студентська спільнота
            </span>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search aria-hidden="true" size={17} />
              <input
                aria-label="Пошук у стрічці"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Пошук у спільноті"
                ref={searchInput}
                value={search}
              />
              <kbd>⌘ K</kbd>
            </label>
            <label className="language-switcher">
              <span className="sr-only">Вибір мови</span>
              <select
                aria-label="Вибір мови інтерфейсу"
                onChange={(event) => setLanguage(event.target.value as Language)}
                value={language}
              >
                <option value="uk">Українська</option>
                <option value="ru">Русский</option>
                <option value="en">English</option>
              </select>
            </label>
            <button
              aria-label="Змінити тему"
              className="icon-button theme-button"
              onClick={toggleTheme}
              title="Змінити тему"
              type="button"
            >
              <Sun className="sun-icon" size={18} />
              <Moon className="moon-icon" size={18} />
            </button>
            <Link aria-label="Увійти до акаунта" className="avatar-link" href="/login">
              <span>З</span>
            </Link>
          </div>
        </header>

        <div className="dashboard-layout">
          <section aria-labelledby="feed-title" className="feed-column" id="feed">
            <div className="welcome-row">
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-dot" />
                  РАДІ БАЧИТИ ТЕБЕ
                </div>
                <h1 id="feed-title">{text.welcome}</h1>
                <p className="welcome-copy">{text.welcomeCopy}</p>
              </div>
              <div className="welcome-sticker" aria-hidden="true">
                <span>тут</span>
                <strong>свої</strong>
                <i>✳</i>
              </div>
            </div>

            <div className="community-banner">
              <div className="banner-sparkle sparkle-one">✳</div>
              <div className="banner-sparkle sparkle-two">✳</div>
              <div className="banner-content">
                <span className="banner-kicker">ПРОСТІР ДЛЯ ТВОГО ГОЛОСУ</span>
                <h2>{text.communityTitle}</h2>
                <p>{text.communityDescription}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 18, maxWidth: 320 }}>
                  <Link
                    href="/feed"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "16px 20px",
                      borderRadius: 14,
                      background: "linear-gradient(135deg, #8b5cf6 0%, #2563eb 100%)",
                      color: "#fff",
                      textDecoration: "none",
                      fontWeight: 700,
                    }}
                  >
                    Предложить пост <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/login"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      width: "100%",
                      padding: "12px 18px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.35)",
                      color: "#fff",
                      textDecoration: "none",
                      background: "rgba(15, 23, 42, 0.18)",
                    }}
                  >
                    Регистрация через Telegram
                  </Link>
                </div>
              </div>
              <div className="banner-art" aria-hidden="true">
                <div className="art-orbit orbit-outer" />
                <div className="art-orbit orbit-inner" />
                <div className="art-core">
                  <AudioMark />
                </div>
                <span className="art-star star-a">✦</span>
                <span className="art-star star-b">✳</span>
                <span className="art-dot dot-a" />
                <span className="art-dot dot-b" />
              </div>
            </div>

            <div className="section-heading">
              <div>
                <h2>{text.feedTitle}</h2>
                <p>{text.feedSubtitle}</p>
              </div>
              <Button
                aria-label="Змінити сортування"
                className="sort-button"
                onClick={() => {
                  const currentIndex = sortOptions.indexOf(sortBy);
                  setSortBy(sortOptions[(currentIndex + 1) % sortOptions.length]);
                }}
                type="button"
                variant="outline"
              >
                <ArrowDownUp size={15} />
                {sortBy}
                <ChevronDown size={14} />
              </Button>
            </div>

            <div aria-label="Фільтр категорій" className="filter-row">
              {filters.map((filter) => (
                <button
                  aria-pressed={activeFilter === filter}
                  className={`filter-chip ${activeFilter === filter ? "filter-chip-active" : ""}`}
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  type="button"
                >
                  {filter === "Усі" && <span className="filter-all-dot" />}
                  {filter}
                </button>
              ))}
              {demoMode && <span className="preview-label">ПРЕВ’Ю</span>}
            </div>

            {visiblePosts.length > 0 ? (
              <div className="post-list">
                {visiblePosts.map((post) => (
                  <article className="post-card" key={post.id}>
                    <div className="post-head">
                      <div className={`post-avatar avatar-${post.avatarTone}`}>
                        {post.initials}
                      </div>
                      <div className="post-author">
                        <div className="author-line">
                          <strong>{post.author}</strong>
                          {post.anonymous && (
                            <span className="anonymous-badge">анонімно</span>
                          )}
                        </div>
                        <span>
                          {post.handle ? `@${post.handle} · ` : ""}
                          {post.time}
                        </span>
                      </div>
                      <span className="post-category">{post.category}</span>
                    </div>
                    <p className="post-content">{post.content}</p>
                    {post.accent === "notes" && (
                      <div className="note-preview">
                        <div className="note-preview-icon">✳</div>
                        <div>
                          <strong>Конспект · Економіка</strong>
                          <span>12 сторінок · коротко і по суті</span>
                        </div>
                        <ArrowRight size={17} />
                      </div>
                    )}
                    <div className="post-actions">
                      <button
                        aria-label={
                          likedPosts.includes(post.id)
                            ? "Прибрати вподобання"
                            : "Вподобати публікацію"
                        }
                        aria-pressed={likedPosts.includes(post.id)}
                        className={`post-action ${likedPosts.includes(post.id) ? "post-action-liked" : ""}`}
                        onClick={() =>
                          setLikedPosts((current) =>
                            current.includes(post.id)
                              ? current.filter((id) => id !== post.id)
                              : [...current, post.id],
                          )
                        }
                        type="button"
                      >
                        <Heart
                          fill={
                            likedPosts.includes(post.id) ? "currentColor" : "none"
                          }
                          size={17}
                        />
                        {post.likes + (likedPosts.includes(post.id) ? 1 : 0)}
                      </button>
                      <Link className="post-action" href="/login">
                        <MessageCircle size={17} />
                        {post.comments} коментарів
                      </Link>
                      <button
                        aria-label={
                          savedPosts.includes(post.id)
                            ? "Прибрати зі збереженого"
                            : "Зберегти публікацію"
                        }
                        aria-pressed={savedPosts.includes(post.id)}
                        className={`post-save ${savedPosts.includes(post.id) ? "post-save-active" : ""}`}
                        onClick={() =>
                          setSavedPosts((current) =>
                            current.includes(post.id)
                              ? current.filter((id) => id !== post.id)
                              : [...current, post.id],
                          )
                        }
                        title="Зберегти"
                        type="button"
                      >
                        {savedPosts.includes(post.id) ? (
                          <Check size={17} />
                        ) : (
                          <Bookmark size={17} />
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-feed">
                <div className="empty-icon">
                  <Search size={22} />
                </div>
                <h3>{demoMode ? "Нічого не знайдено" : "Тут буде твоя стрічка"}</h3>
                <p>
                  {demoMode
                    ? "Спробуй інше слово або вибери іншу категорію."
                    : "Коли спільнота наповниться публікаціями, вони з’являться тут."}
                </p>
                {demoMode && (
                  <button
                    className="text-button"
                    onClick={() => {
                      setSearch("");
                      setActiveFilter("Усі");
                    }}
                    type="button"
                  >
                    Скинути фільтри
                  </button>
                )}
              </div>
            )}

            <section aria-labelledby="about-title" className="about-strip" id="about">
              <div className="about-icon">
                <Sparkles size={19} />
              </div>
              <div>
                <h2 id="about-title">Спільнота, у якій є місце кожному</h2>
                <p>
                  Ділися думками, знаходь однодумців і створюй атмосферу свого
                  кампусу.
                </p>
              </div>
              <Link aria-label="Увійти, щоб приєднатися" href="/login">
                <ArrowRight size={19} />
              </Link>
            </section>
          </section>

          <aside aria-label="Про спільноту" className="right-column" id="community">
            <section className="join-card">
              <div className="join-card-top">
                <span className="join-icon">
                  <UsersRound size={18} />
                </span>
                <span className="join-status">
                  <span />
                  ПРОСТІР ДЛЯ СВОЇХ
                </span>
              </div>
              <h2>Тут твої люди.</h2>
              <p>
                Долучайся до студентської спільноти ЗІЕІТ — говорити, ділитися й
                бути поруч.
              </p>
              <Link className="join-button" href="/login">
                Увійти до спільноти <ArrowRight size={16} />
              </Link>
              <span className="join-footnote">
                Реєстрація/регистрация проходит через Telegram-бота. Після входу в бот можна перейти на сайт: {siteUrl}
              </span>
            </section>

            <section className="side-card campus-card">
              <div className="side-card-heading">
                <div className="side-card-icon campus-icon">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3>Настрій кампусу</h3>
                  <span>СТАН ПРОЄКТУ</span>
                </div>
              </div>
              <p className="campus-message">
                Готуємо місце, де університетське життя стає ближчим.
              </p>
              <div className="progress-line">
                <span />
              </div>
              <div className="progress-caption">
                <span>Фундамент платформи</span>
                <span>01 / 06</span>
              </div>
            </section>

            <section className="side-card about-card">
              <div className="side-card-heading">
                <div className="side-card-icon about-card-icon">
                  <Bell size={16} />
                </div>
                <div>
                  <h3>Почни з простого</h3>
                  <span>ТВІЙ НАСТУПНИЙ КРОК</span>
                </div>
              </div>
              <p>
                Увійди, щоб налаштувати профіль. Реєстрація на платформі
                відбувається через Telegram-бота. Після цього можна виконати
                вхід на сайт і почати публікувати дописи.
              </p>
              <Link className="side-card-link" href="/login">
                Перейти до входу <ArrowRight size={15} />
              </Link>
            </section>

            <footer className="right-footer">
              <a href="#about">Про платформу</a>
              <span>·</span>
              <span>Зроблено для студентів ЗІЕІТ</span>
              <span>© 2026</span>
            </footer>
          </aside>
        </div>
      </main>

    </div>
  );
}

function AudioMark() {
  return (
    <span className="audio-mark">
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </span>
  );
}
