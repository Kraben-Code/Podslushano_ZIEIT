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

export function AppDashboard({
  demoMode,
  posts,
}: {
  demoMode: boolean;
  posts: FeedPost[];
}) {
  const [activeFilter, setActiveFilter] = useState("Усі");
  const [sortBy, setSortBy] = useState<SortOption>("Найновіші");
  const [search, setSearch] = useState("");
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

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

        <div className="campus-label">ТВІЙ КАМПУС, ТВОЇ ЛЮДИ</div>
        <nav aria-label="Головна навігація" className="main-nav">
          <a className="nav-link nav-link-active" href="#feed">
            <Compass size={18} />
            <span>Стрічка</span>
            <span className="nav-pulse" />
          </a>
          <a className="nav-link" href="#community">
            <UsersRound size={18} />
            <span>Спільнота</span>
          </a>
          <a className="nav-link" href="#about">
            <CircleHelp size={18} />
            <span>Про проєкт</span>
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
                <h1 id="feed-title">Привіт, студенте 👋</h1>
                <p className="welcome-copy">
                  Тут починається все, про що говорить твій кампус.
                </p>
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
                <h2>Твій кампус. Твоя історія.</h2>
                <p>
                  Знайомся, ділися думками й залишайся на зв’язку з тими, хто
                  поруч.
                </p>
                <Link className="banner-link" href="/login">
                  Приєднатися до спільноти <ArrowRight size={16} />
                </Link>
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
                <h2>Стрічка спільноти</h2>
                <p>Думки, новини й маленькі моменти з життя кампусу.</p>
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
                Немає акаунта? Реєстрація буде доступна через Telegram-бота.
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
                відбуватиметься через особистого Telegram-бота.
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
