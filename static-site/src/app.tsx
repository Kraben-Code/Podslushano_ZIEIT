import {
  ArrowUpRight,
  Bell,
  Heart,
  LogIn,
  LogOut,
  MessageCircle,
  Moon,
  Plus,
  Send,
  ShieldCheck,
  Store,
  Sun,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import {
  type ChatMessage,
  type ChatRoom,
  type CommunityPost,
  type CommunityRole,
  type Listing,
  type Profile,
  isBackendConfigured,
  supabase,
} from "./lib/backend";

type Page = "home" | "overheard" | "chat" | "marketplace" | "channel" | "profile" | "moderation";
type Language = "ru" | "uk" | "en";
type Theme = "light" | "dark";
type Author = Pick<Profile, "id" | "username" | "display_name" | "role">;
type CommentRow = { id: string; author_id: string; content: string; created_at: string };
type ReviewListing = Pick<Listing, "id" | "author_id" | "title" | "description" | "price" | "category" | "status" | "created_at">;
type PostDraft = { content: string; category: string; isAnonymous: boolean };
type AuthMode = "sign-in" | "sign-up";

const navigation: { id: Page; label: string; icon: typeof UsersRound }[] = [
  { id: "home", label: "Главная", icon: UsersRound },
  { id: "overheard", label: "Подслушано", icon: Bell },
  { id: "chat", label: "Чат", icon: MessageCircle },
  { id: "marketplace", label: "Барахолка", icon: Store },
  { id: "channel", label: "Канал", icon: ArrowUpRight },
  { id: "profile", label: "Профиль", icon: UserRound },
  { id: "moderation", label: "Модерация", icon: ShieldCheck },
];
const roleRank: Record<CommunityRole, number> = { user: 0, moderator: 1, admin: 2, owner: 3 };
const roleLabels: Record<CommunityRole, string> = {
  user: "Пользователь",
  moderator: "Модератор",
  admin: "Администратор",
  owner: "Владелец",
};

const pageHeadings: Record<Page, { title: string; description: string }> = {
  home: { title: "Сообщество ЗИЕИТ", description: "Общайся, делись новостями и находи полезное для учёбы и жизни." },
  overheard: { title: "Подслушано", description: "Истории и публикации студентов. Перед публикацией пост проверяет модерация." },
  chat: { title: "Студенческий чат", description: "Живое общение без автоответов и фальшивых пользователей." },
  marketplace: { title: "Барахолка", description: "Покупай, продавай и отдавай вещи студентам." },
  channel: { title: "Канал сообщества", description: "Публикации, прошедшие модерацию и отправленные в Telegram." },
  profile: { title: "Мой профиль", description: "Настрой имя, описание и ссылку на аватар." },
  moderation: { title: "Панель команды", description: "Модерация публикаций и управление ролями участников." },
};
const pageHeadingsByLanguage: Record<Language, Record<Page, { title: string; description: string }>> = {
  ru: pageHeadings,
  uk: {
    home: { title: "Спільнота ЗІЕІТ", description: "Спілкуйся, ділися новинами та знаходь корисне для навчання й життя." },
    overheard: { title: "Подслушано", description: "Історії та дописи студентів. Перед публікацією допис перевіряє модерація." },
    chat: { title: "Студентський чат", description: "Живе спілкування без автоматичних відповідей." },
    marketplace: { title: "Барахолка", description: "Купуй, продавай і віддавай речі студентам." },
    channel: { title: "Канал спільноти", description: "Публікації після модерації та дописи з Telegram." },
    profile: { title: "Мій профіль", description: "Налаштуй ім’я, опис і посилання на аватар." },
    moderation: { title: "Панель команди", description: "Модерація публікацій та керування ролями учасників." },
  },
  en: {
    home: { title: "ZIEIT Community", description: "Connect, share news, and find useful things for campus life." },
    overheard: { title: "Overheard", description: "Student stories. Authors may post anonymously." },
    chat: { title: "Student chat", description: "Live conversation with real community members." },
    marketplace: { title: "Marketplace", description: "Buy, sell, and give items to other students." },
    channel: { title: "Community channel", description: "Moderated posts shared with the Telegram channel." },
    profile: { title: "My profile", description: "Update your display name, bio, and avatar link." },
    moderation: { title: "Team panel", description: "Review submissions and manage community roles." },
  },
};

function requireBackend() {
  if (!supabase) throw new Error("Сервис временно не настроен. Попробуйте позже.");
  return supabase;
}

async function getAuthors(ids: string[]) {
  const client = requireBackend();
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return new Map<string, Author>();
  const { data, error } = await client
    .from("community_profiles")
    .select("id, username, display_name, role")
    .in("id", uniqueIds);
  if (error) throw error;
  return new Map((data ?? []).map((profile) => [profile.id, profile as Author]));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function RoleBadge({ role }: { role: CommunityRole }) {
  if (role === "user") return null;
  return <span className={`role-badge role-${role}`}>{roleLabels[role]}</span>;
}

export function App() {
  const [page, setPage] = useState<Page>("home");
  const [postPreview, setPostPreview] = useState<PostDraft | null>(null);
  const [language, setLanguage] = useState<Language>("ru");
  const [theme, setTheme] = useState<Theme>("light");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingPosts, setPendingPosts] = useState<CommunityPost[]>([]);
  const [pendingListings, setPendingListings] = useState<ReviewListing[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const postComposerRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const applyHash = () => {
      const requested = window.location.hash.slice(1) as Page;
      if (navigation.some((item) => item.id === requested)) setPage(requested);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("zieit-language");
    if (saved === "uk" || saved === "ru" || saved === "en") setLanguage(saved);
    if (window.localStorage.getItem("zieit-theme") === "dark") setTheme("dark");
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem("zieit-language", language);
  }, [language]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("zieit-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setProfile(null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !user) {
      setProfile(null);
      return;
    }

    let active = true;
    void supabase
      .from("community_profiles")
      .select("id, username, display_name, bio, avatar_url, role")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data, error: profileError }) => {
        if (!active) return;
        if (profileError) setError(profileError.message);
        else setProfile(data as Profile | null);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const canModerate = Boolean(profile && roleRank[profile.role] >= roleRank.moderator);

  const loadModeration = useCallback(async () => {
    if (!supabase || page !== "moderation" || !canModerate) return;
    setError("");
    let postsQuery = supabase
      .from("community_posts")
      .select("id, author_id, category, content, is_anonymous, moderation_status, source, published_to_channel, created_at")
      .order("created_at", { ascending: false })
      .limit(150);
    let listingsQuery = supabase
      .from("marketplace_listings")
      .select("id, author_id, title, description, price, category, status, created_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (profile?.role !== "owner") {
      postsQuery = postsQuery.eq("moderation_status", "pending");
      listingsQuery = listingsQuery.eq("status", "pending");
    }
    const [postResult, listingResult] = await Promise.all([postsQuery, listingsQuery]);
    if (postResult.error) setError(postResult.error.message);
    else setPendingPosts((postResult.data ?? []) as CommunityPost[]);
    if (listingResult.error) setError(listingResult.error.message);
    else setPendingListings((listingResult.data ?? []) as ReviewListing[]);

    if (profile && roleRank[profile.role] >= roleRank.admin) {
      const { data, error: membersError } = await supabase
        .from("community_profiles")
        .select("id, username, display_name, bio, avatar_url, role")
        .order("username");
      if (membersError) setError(membersError.message);
      else setMembers((data ?? []) as Profile[]);
    }
  }, [canModerate, page, profile?.role]);

  useEffect(() => {
    void loadModeration();
  }, [loadModeration]);

  const loadPosts = useCallback(async () => {
    if (!supabase || (page !== "overheard" && page !== "channel")) return;
    setError("");
    let query = supabase
      .from("community_posts")
      .select("id, author_id, category, content, is_anonymous, moderation_status, source, published_to_channel, created_at")
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .limit(60);

    if (page === "channel") query = query.eq("published_to_channel", true);

    const { data, error: postsError } = await query;
    if (postsError) {
      setError(postsError.message);
      return;
    }

    const rows = (data ?? []) as CommunityPost[];
    setPosts(rows);
    try {
      setAuthors(await getAuthors(rows.map((post) => post.author_id)));
    } catch (authorError) {
      setError(authorError instanceof Error ? authorError.message : "Не удалось загрузить авторов.");
    }
  }, [page]);

  const loadListings = useCallback(async () => {
    if (!supabase || page !== "marketplace") return;
    let query = supabase
      .from("marketplace_listings")
      .select("id, author_id, title, description, price, category, status, created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (profile?.role !== "owner") {
      if (user) query = query.or(`status.eq.active,author_id.eq.${user.id}`);
      else query = query.eq("status", "active");
    }

    const { data, error: listingsError } = await query;
    if (listingsError) {
      setError(listingsError.message);
      return;
    }
    const rows = (data ?? []) as Listing[];
    setListings(rows);
    try {
      setAuthors(await getAuthors(rows.map((listing) => listing.author_id)));
    } catch (authorError) {
      setError(authorError instanceof Error ? authorError.message : "Не удалось загрузить авторов.");
    }
  }, [page, profile?.role, user]);

  useEffect(() => {
    void loadPosts();
    void loadListings();
  }, [loadPosts, loadListings]);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("community_chat_rooms")
      .select("key, name, description")
      .order("name")
      .then(({ data, error: roomError }) => {
        if (roomError) setError(roomError.message);
        else setRooms((data ?? []) as ChatRoom[]);
      });
  }, []);

  function previewPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setAuthMode("sign-in");
      return;
    }
    const form = new FormData(formElement);
    const content = String(form.get("content") ?? "").trim();
    if (content.length < 5) {
      setError("Напишите немного подробнее — минимум 5 символов.");
      return;
    }

    setError("");
    setPostPreview({
      content,
      category: String(form.get("category") ?? "overheard"),
      isAnonymous: form.get("anonymous") === "on",
    });
  }

  async function publishPost() {
    if (!user || !postPreview) return;
    setBusy(true);
    setError("");
    try {
      const client = requireBackend();
      const { error: insertError } = await client.from("community_posts").insert({
        author_id: user.id,
        category: postPreview.category,
        content: postPreview.content,
        is_anonymous: postPreview.isAnonymous,
        source: "site",
        moderation_status: "pending",
      });
      if (insertError) throw insertError;
      postComposerRef.current?.reset();
      setPostPreview(null);
      setNotice("Пост отправлен модераторам. После одобрения он появится в Подслушано и Telegram.");
      await loadPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось отправить публикацию.");
    } finally {
      setBusy(false);
    }

    function cancelPostPreview() {
      postComposerRef.current?.reset();
      setPostPreview(null);
    }
  }

  async function submitListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!user) {
      setAuthMode("sign-in");
      return;
    }
    const form = new FormData(formElement);
    const priceValue = String(form.get("price") ?? "").trim();
    const price = priceValue ? Number(priceValue) : null;
    if (price !== null && (!Number.isSafeInteger(price) || price < 0)) {
      setError("Цена должна быть целым числом не меньше нуля.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const client = requireBackend();
      const { error: insertError } = await client.from("marketplace_listings").insert({
        author_id: user.id,
        title: String(form.get("title") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        category: String(form.get("category") ?? "other"),
        price,
        status: "pending",
      });
      if (insertError) throw insertError;
      formElement.reset();
      setNotice("Объявление отправлено на проверку.");
      await loadListings();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Не удалось создать объявление.");
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    const form = new FormData(event.currentTarget);
    const updates = {
      display_name: String(form.get("display_name") ?? "").trim(),
      bio: String(form.get("bio") ?? "").trim() || null,
      avatar_url: String(form.get("avatar_url") ?? "").trim() || null,
    };
    setBusy(true);
    setError("");
    try {
      const { data, error: updateError } = await requireBackend()
        .from("community_profiles")
        .update(updates)
        .eq("id", user.id)
        .select("id, username, display_name, bio, avatar_url, role")
        .single();
      if (updateError) throw updateError;
      setProfile(data as Profile);
      setNotice("Профиль сохранён.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Не удалось сохранить профиль.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewPost(postId: string, nextStatus: "approved" | "rejected") {
    setBusy(true);
    setError("");
    try {
      const { error: reviewError } = await requireBackend().rpc("moderate_community_post", {
        target_post_id: postId,
        next_status: nextStatus,
      });
      if (reviewError) throw reviewError;
      setNotice(nextStatus === "approved" ? "Пост одобрен." : "Пост отклонён.");
      await Promise.all([loadModeration(), loadPosts()]);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Не удалось изменить статус поста.");
    } finally {
      setBusy(false);
    }
  }

  async function reviewListing(listingId: string, nextStatus: "active" | "rejected") {
    setBusy(true);
    setError("");
    try {
      const { error: reviewError } = await requireBackend().rpc("moderate_marketplace_listing", {
        target_listing_id: listingId,
        next_status: nextStatus,
      });
      if (reviewError) throw reviewError;
      setNotice(nextStatus === "active" ? "Объявление опубликовано." : "Объявление отклонено.");
      await Promise.all([loadModeration(), loadListings()]);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Не удалось изменить статус объявления.");
    } finally {
      setBusy(false);
    }
  }

  async function updateMemberRole(memberId: string, nextRole: CommunityRole) {
    setBusy(true);
    setError("");
    try {
      const { error: roleError } = await requireBackend().rpc("set_community_role", {
        target_user_id: memberId,
        next_role: nextRole,
      });
      if (roleError) throw roleError;
      setNotice("Роль участника обновлена.");
      await loadModeration();
      if (memberId === user?.id) {
        const { data, error: profileError } = await requireBackend()
          .from("community_profiles")
          .select("id, username, display_name, bio, avatar_url, role")
          .eq("id", memberId)
          .single();
        if (profileError) throw profileError;
        setProfile(data as Profile);
      }
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Не удалось изменить роль.");
    } finally {
      setBusy(false);
    }
  }

  async function ownerDelete(
    functionName: "owner_delete_community_post" | "owner_delete_marketplace_listing" | "owner_delete_chat_message",
    targetId: string,
  ) {
    if (profile?.role !== "owner") {
      setError("Удалять материалы может только владелец сообщества.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { error: deleteError } = await requireBackend().rpc(functionName, { target_id: targetId });
      if (deleteError) throw deleteError;
      setNotice("Материал удалён.");
      await Promise.all([loadPosts(), loadListings(), loadModeration()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Не удалось удалить материал.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) setError(signOutError.message);
    else setNotice("Вы вышли из аккаунта.");
  }

  function navigate(nextPage: Page) {
    setPage(nextPage);
    window.location.hash = nextPage;
    setError("");
    setNotice("");
  }

  const heading = pageHeadingsByLanguage[language][page];
  const accountLabel = profile?.display_name || user?.email || "";
  const visibleNavigation = navigation.filter((item) => item.id !== "moderation" || canModerate);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#feed" onClick={() => navigate("feed")}>
          <span className="brand-mark">П</span>
          <span>Подслушано<small>ЗИЕИТ · сообщество</small></span>
        </a>
        <div className="campus-card">
          <span className="eyebrow">ВАШ КАМПУС</span>
          <strong>ЗИЕИТ</strong>
          <span>Место, где студенты рядом</span>
        </div>
        <nav className="main-nav" aria-label="Основная навигация">
          {visibleNavigation.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" className={page === id ? "nav-item active" : "nav-item"} onClick={() => navigate(id)}>
              <Icon size={18} />
              {label}
              {id === "chat" && <span className="nav-live" title="Сообщения обновляются в реальном времени" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {user ? (
            <>
              <div className="user-chip">
                <span className="avatar">{accountLabel.slice(0, 1).toUpperCase() || "С"}</span>
                <span><strong>{accountLabel}</strong><small>@{profile?.username ?? "студент"}</small>{profile && <RoleBadge role={profile.role} />}</span>
              </div>
              <button className="subtle-button" type="button" onClick={() => void signOut()}><LogOut size={16} /> Выйти</button>
            </>
          ) : (
            <button className="primary-button full-button" type="button" onClick={() => setAuthMode("sign-in")}><LogIn size={16} /> Войти / регистрация</button>
          )}
          <a className="telegram-link" href="https://t.me/testerrnet" target="_blank" rel="noreferrer">
            Открыть Telegram-канал <ArrowUpRight size={14} />
          </a>
          <span className="footer-note">Уважение и безопасность — основа сообщества</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">СООБЩЕСТВО <span>/</span> {navigation.find((item) => item.id === page)?.label.toUpperCase()}</div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label={theme === "dark" ? "Включить светлую тему" : "Включить тёмную тему"} title={theme === "dark" ? "Светлая тема" : "Тёмная тема"} type="button" onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <label className="language-control">
              <span className="sr-only">Язык</span>
              <select aria-label="Язык интерфейса" value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                <option value="ru">RU</option><option value="uk">UA</option><option value="en">EN</option>
              </select>
            </label>
            {user ? (
              <button className="icon-button" aria-label="Профиль" type="button" onClick={() => navigate("profile")}><UserRound size={18} /></button>
            ) : (
              <button className="top-login" type="button" onClick={() => setAuthMode("sign-in")}>Войти</button>
            )}
          </div>
        </header>

        <section className="page-heading">
          <div><span className="eyebrow">{page === "overheard" ? "АНОНИМНЫЕ ИСТОРИИ" : "СТУДЕНЧЕСКАЯ СРЕДА"}</span><h1>{heading.title}</h1><p>{heading.description}</p></div>
          {(page === "feed" || page === "overheard") && <button className="primary-button" type="button" onClick={() => document.getElementById("post-content")?.focus()}><Plus size={17} /> Предложить пост</button>}
        </section>

        {!isBackendConfigured && (
          <div className="notice warning" role="status">
            <strong>База ещё не подключена.</strong> Сайт соберётся, но регистрация и публикации станут доступны после настройки Supabase и секретов GitHub Actions.
          </div>
        )}
        {notice && <div className="notice success" role="status">{notice}</div>}
        {error && <div className="notice error" role="alert">{error}</div>}

        <div className="content-grid">
          <div className="primary-column">
            {(page === "feed" || page === "overheard") && (
              <>
                <PostComposer page={page} busy={busy} signedIn={Boolean(user)} onSubmit={submitPost} onNeedAuth={() => setAuthMode("sign-in")} />
                <div className="section-title"><h2>{page === "overheard" ? "Истории студентов" : "Последние публикации"}</h2><span>{posts.length} публикаций</span></div>
                <div className="card-list">
                  {posts.map((post) => <PostCard key={post.id} post={post} author={authors.get(post.author_id)} user={user} isOwner={profile?.role === "owner"} onOwnerDelete={(id) => void ownerDelete("owner_delete_community_post", id)} onNeedAuth={() => setAuthMode("sign-in")} />)}
                  {posts.length === 0 && <EmptyCard title="Пока нет публикаций" text="Публикации появятся здесь после одобрения модератора." />}
                </div>
              </>
            )}
            {page === "chat" && <ChatPanel rooms={rooms} user={user} role={profile?.role ?? "user"} onNeedAuth={() => setAuthMode("sign-in")} onOwnerDelete={(id) => void ownerDelete("owner_delete_chat_message", id)} />}
            {page === "marketplace" && (
              <>
                <ListingComposer busy={busy} signedIn={Boolean(user)} onSubmit={submitListing} onNeedAuth={() => setAuthMode("sign-in")} />
                <div className="section-title"><h2>Объявления</h2><span>{listings.length} предложений</span></div>
                <div className="listing-grid">
                  {listings.map((listing) => <ListingCard key={listing.id} listing={listing} author={authors.get(listing.author_id)} isOwner={profile?.role === "owner"} onOwnerDelete={(id) => void ownerDelete("owner_delete_marketplace_listing", id)} />)}
                  {listings.length === 0 && <EmptyCard title="Объявлений пока нет" text="Создайте первое объявление — оно появится после проверки." />}
                </div>
              </>
            )}
            {page === "channel" && (
              <div className="card-list">
                {posts.map((post) => <PostCard key={post.id} post={post} author={authors.get(post.author_id)} user={user} isOwner={profile?.role === "owner"} onOwnerDelete={(id) => void ownerDelete("owner_delete_community_post", id)} onNeedAuth={() => setAuthMode("sign-in")} />)}
                {posts.length === 0 && <EmptyCard title="Канал готовится" text="Здесь появятся публикации, одобренные модераторами и отправленные в Telegram." />}
                <a className="telegram-banner" href="https://t.me/testerrnet" target="_blank" rel="noreferrer"><span><strong>Канал в Telegram</strong><small>Публикации сайта и Telegram после модерации</small></span><ArrowUpRight /></a>
              </div>
            )}
            {page === "profile" && (
              user && profile ? (
                <form className="surface profile-form" onSubmit={(event) => void updateProfile(event)}>
                  <div className="profile-hero"><span className="avatar avatar-large">{profile.display_name.slice(0, 1).toUpperCase()}</span><div><h2>{profile.display_name}</h2><span>@{profile.username}</span><RoleBadge role={profile.role} /></div></div>
                  <label className="field"><span>Имя в профиле</span><input name="display_name" required maxLength={48} defaultValue={profile.display_name} /></label>
                  <label className="field"><span>О себе</span><textarea name="bio" maxLength={240} rows={3} defaultValue={profile.bio ?? ""} placeholder="Расскажите о себе" /></label>
                  <label className="field"><span>Ссылка на аватар</span><input name="avatar_url" type="url" defaultValue={profile.avatar_url ?? ""} placeholder="https://..." /></label>
                  <button className="primary-button" disabled={busy} type="submit">{busy ? "Сохраняем…" : "Сохранить профиль"}</button>
                </form>
              ) : (
                <EmptyCard title="Войдите, чтобы открыть профиль" text="Регистрация нужна для сообщений, объявлений и участия в жизни сообщества." action={<button className="primary-button" type="button" onClick={() => setAuthMode("sign-in")}>Войти или зарегистрироваться</button>} />
              )
            )}
            {page === "moderation" && (
              canModerate ? (
                <ModerationPanel
                  posts={pendingPosts}
                  listings={pendingListings}
                    members={profile && roleRank[profile.role] >= roleRank.admin ? members : []}
                  isOwner={profile?.role === "owner"}
                  busy={busy}
                  onReviewPost={(id, status) => void reviewPost(id, status)}
                  onReviewListing={(id, status) => void reviewListing(id, status)}
                  onSetRole={(id, role) => void updateMemberRole(id, role)}
                  onOwnerDeletePost={(id) => void ownerDelete("owner_delete_community_post", id)}
                  onOwnerDeleteListing={(id) => void ownerDelete("owner_delete_marketplace_listing", id)}
                />
              ) : (
                <EmptyCard title="Доступ запрещён" text="Панель доступна только модераторам, администраторам и владельцу сообщества." />
              )
            )}
          </div>

          <aside className="right-column">
            <div className="surface welcome-card"><span className="welcome-icon">З</span><span className="eyebrow">ВАШЕ СООБЩЕСТВО</span><h2>Учёба — не только пары</h2><p>Общайся, делись новостями, находи вещи и помогай друг другу.</p><button className="text-button" type="button" onClick={() => navigate("chat")}>Перейти в чат <ArrowUpRight size={15} /></button></div>
            <div className="surface rules-card"><h3>Правила сообщества</h3><ul><li>Общайтесь уважительно.</li><li>Не публикуйте личные данные других людей.</li><li>Посты и объявления проходят модерацию.</li><li>Анонимность не отменяет проверку правил.</li></ul></div>
            <div className="side-stat"><span className="online-indicator" /> Сайт подключён к Supabase <small>{isBackendConfigured ? "Сервисы настроены" : "Ожидает настройки"}</small></div>
          </aside>
        </div>
        <footer className="main-footer">© 2026 Подслушано ЗИЕИТ <span>·</span> Студенческое сообщество</footer>
      </main>

      {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onModeChange={setAuthMode} onNotice={setNotice} onError={setError} />}
    </div>
  );
}

function ModerationPanel({
  posts,
  listings,
  members,
  isOwner,
  busy,
  onReviewPost,
  onReviewListing,
  onSetRole,
  onOwnerDeletePost,
  onOwnerDeleteListing,
}: {
  posts: CommunityPost[];
  listings: ReviewListing[];
  members: Profile[];
  isOwner: boolean;
  busy: boolean;
  onReviewPost: (id: string, status: "approved" | "rejected") => void;
  onReviewListing: (id: string, status: "active" | "rejected") => void;
  onSetRole: (id: string, role: CommunityRole) => void;
  onOwnerDeletePost: (id: string) => void;
  onOwnerDeleteListing: (id: string) => void;
}) {
  return (
    <div className="moderation-panel">
      <div className="surface rules-card">
        <h2>Права доступа</h2>
        <ul>
          <li><strong>Пользователь:</strong> редактирует свой профиль, пишет в чат и отправляет посты и объявления на проверку.</li>
          <li><strong>Модератор:</strong> дополнительно одобряет или отклоняет посты и объявления.</li>
          <li><strong>Администратор:</strong> выполняет модерацию и назначает или снимает роль модератора.</li>
          <li><strong>Владелец:</strong> управляет всеми ролями, включая администраторов и владельцев.</li>
        </ul>
      </div>

      <section>
        <div className="section-title"><h2>{isOwner ? "Все публикации" : "Посты на проверке"}</h2><span>{posts.length}</span></div>
        <div className="card-list">
          {posts.map((post) => (
            <article className="surface moderation-card" key={post.id}>
              <div className="composer-controls"><span className="category-pill">{post.category}</span><span className="muted small">{post.source === "telegram" ? "Из Telegram" : "С сайта"} · {formatTime(post.created_at)}</span></div>
              <p>{post.content}</p>
              <small className="muted">{post.is_anonymous ? "Анонимная публикация" : `Автор: ${post.author_id}`}</small>
              <div className="moderation-actions">
                <span className="pending-pill">{post.moderation_status === "pending" ? "На проверке" : post.moderation_status === "approved" ? "Одобрен" : "Отклонён"}</span>
                {post.moderation_status === "pending" && <><button className="primary-button" disabled={busy} type="button" onClick={() => onReviewPost(post.id, "approved")}>Одобрить</button><button className="subtle-button" disabled={busy} type="button" onClick={() => onReviewPost(post.id, "rejected")}>Отклонить</button></>}
                {isOwner && <button className="post-action owner-delete" disabled={busy} type="button" onClick={() => { if (window.confirm("Удалить публикацию без возможности восстановления?")) onOwnerDeletePost(post.id); }}>Удалить навсегда</button>}
              </div>
            </article>
          ))}
          {posts.length === 0 && <EmptyCard title="Новых постов нет" text="Все публикации проверены." />}
        </div>
      </section>

      <section>
        <div className="section-title"><h2>{isOwner ? "Все объявления" : "Объявления на проверке"}</h2><span>{listings.length}</span></div>
        <div className="card-list">
          {listings.map((listing) => (
            <article className="surface moderation-card" key={listing.id}>
              <div className="composer-controls"><span className="category-pill">{listing.category}</span><span className="muted small">{formatTime(listing.created_at)}</span></div>
              <h3>{listing.title}</h3>
              <p>{listing.description}</p>
              <strong>{listing.price === null ? "Договорная" : `${listing.price.toLocaleString("ru-RU")} ₴`}</strong>
              <div className="moderation-actions">
                <span className="pending-pill">{listing.status === "pending" ? "На проверке" : listing.status === "active" ? "Активно" : listing.status === "sold" ? "Продано" : "Отклонено"}</span>
                {listing.status === "pending" && <><button className="primary-button" disabled={busy} type="button" onClick={() => onReviewListing(listing.id, "active")}>Опубликовать</button><button className="subtle-button" disabled={busy} type="button" onClick={() => onReviewListing(listing.id, "rejected")}>Отклонить</button></>}
                {isOwner && <button className="post-action owner-delete" disabled={busy} type="button" onClick={() => { if (window.confirm("Удалить объявление без возможности восстановления?")) onOwnerDeleteListing(listing.id); }}>Удалить навсегда</button>}
              </div>
            </article>
          ))}
          {listings.length === 0 && <EmptyCard title="Новых объявлений нет" text="Все объявления проверены." />}
        </div>
      </section>

      {members.length > 0 && (
        <section>
          <div className="section-title"><h2>Управление ролями</h2><span>{members.length} участников</span></div>
          <div className="card-list">
            {members.map((member) => (
              <article className="surface moderation-card member-role-row" key={member.id}>
                <div><strong>{member.display_name}</strong><small>@{member.username}</small><RoleBadge role={member.role} /></div>
                <label className="field role-field">
                  <span className="sr-only">Роль пользователя {member.username}</span>
                  <select value={member.role} disabled={busy || (!isOwner && member.role !== "user" && member.role !== "moderator")} onChange={(event) => onSetRole(member.id, event.target.value as CommunityRole)}>
                    <option value="user">Пользователь</option>
                    <option value="moderator">Модератор</option>
                    {!isOwner && member.role !== "user" && member.role !== "moderator" && <option value={member.role}>{roleLabels[member.role]}</option>}
                    {isOwner && <><option value="admin">Администратор</option><option value="owner">Владелец</option></>}
                  </select>
                </label>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PostComposer({ page, busy, signedIn, onSubmit, onNeedAuth }: { page: Page; busy: boolean; signedIn: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onNeedAuth: () => void }) {
  return (
    <form className="surface composer" onSubmit={onSubmit}>
      <div className="composer-title"><span className="avatar">С</span><strong>Есть чем поделиться?</strong></div>
      <textarea id="post-content" name="content" maxLength={3000} minLength={5} rows={3} placeholder={page === "overheard" ? "Расскажите историю. Можно анонимно…" : "Напишите пост для сообщества…"} required />
      <div className="composer-controls">
        {page === "overheard" ? <label className="check-label"><input type="checkbox" name="anonymous" defaultChecked /> Опубликовать анонимно</label> : <select name="category" aria-label="Категория"><option value="general">Общее</option><option value="study">Учёба</option><option value="event">События</option><option value="question">Вопрос</option></select>}
        <span className="muted small">Публикация появится после модерации</span>
        <button className="primary-button" type="submit" disabled={busy}><Send size={15} />{busy ? "Отправляем…" : "На модерацию"}</button>
      </div>
      {!signedIn && <button className="composer-auth-hint" type="button" onClick={onNeedAuth}>Нужно войти, чтобы отправить публикацию</button>}
    </form>
  );
}

function PostCard({ post, author, user, isOwner, onOwnerDelete, onNeedAuth }: { post: CommunityPost; author?: Author; user: User | null; isOwner: boolean; onOwnerDelete: (id: string) => void; onNeedAuth: () => void }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentAuthors, setCommentAuthors] = useState<Map<string, Author>>(new Map());
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    const client = requireBackend();
    const { data, error: commentsError } = await client
      .from("community_post_comments")
      .select("id, author_id, content, created_at")
      .eq("post_id", post.id)
      .order("created_at");
    if (commentsError) {
      setError(commentsError.message);
      return;
    }
    const rows = (data ?? []) as CommentRow[];
    setComments(rows);
    setCommentAuthors(await getAuthors(rows.map((item) => item.author_id)));
  }, [post.id]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void (async () => {
      const { count } = await supabase
        .from("community_post_reactions")
        .select("id", { count: "exact", head: true })
        .eq("post_id", post.id);
      if (active) setLikes(count ?? 0);
      if (user) {
        const { data } = await supabase
          .from("community_post_reactions")
          .select("id")
          .eq("post_id", post.id)
          .eq("author_id", user.id)
          .maybeSingle();
        if (active) setLiked(Boolean(data));
      }
    })();
    return () => {
      active = false;
    };
  }, [post.id, user]);

  async function toggleReaction() {
    if (!user) return onNeedAuth();
    const client = requireBackend();
    setError("");
    if (liked) {
      const { error: deleteError } = await client
        .from("community_post_reactions")
        .delete()
        .eq("post_id", post.id)
        .eq("author_id", user.id);
      if (deleteError) setError(deleteError.message);
      else {
        setLiked(false);
        setLikes((count) => Math.max(0, count - 1));
      }
    } else {
      const { error: insertError } = await client.from("community_post_reactions").insert({
        post_id: post.id,
        author_id: user.id,
        reaction: "heart",
      });
      if (insertError) setError(insertError.message);
      else {
        setLiked(true);
        setLikes((count) => count + 1);
      }
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return onNeedAuth();
    const content = commentDraft.trim();
    if (!content) return;
    const { error: insertError } = await requireBackend()
      .from("community_post_comments")
      .insert({ post_id: post.id, author_id: user.id, content });
    if (insertError) setError(insertError.message);
    else {
      setCommentDraft("");
      await loadComments();
    }
  }

  async function toggleComments() {
    setCommentOpen((open) => !open);
    if (!commentOpen) await loadComments();
  }

  async function deleteComment(commentId: string) {
    const { error: deleteError } = await requireBackend().rpc("owner_delete_comment", { target_id: commentId });
    if (deleteError) setError(deleteError.message);
    else await loadComments();
  }

  return (
    <article className="surface post-card">
      <header className="post-meta">
        <span className="avatar">{post.is_anonymous ? "?" : (author?.display_name.slice(0, 1).toUpperCase() ?? "С")}</span>
        <span className="post-author"><strong>{post.is_anonymous ? "Анонимный студент" : author?.display_name ?? "Студент"}</strong>{!post.is_anonymous && author && <RoleBadge role={author.role} />}<small>{formatTime(post.created_at)} · {post.source === "telegram" ? "Telegram" : "Сайт"}</small></span>
        <span className="category-pill">{post.category === "overheard" ? "Подслушано" : post.category}</span>
      </header>
      <p className="post-content">{post.content}</p>
      <footer className="post-actions">
        <button className={liked ? "post-action liked" : "post-action"} type="button" onClick={() => void toggleReaction()}><Heart size={16} fill={liked ? "currentColor" : "none"} /> {likes}</button>
        <button className="post-action" type="button" onClick={() => void toggleComments()}><MessageCircle size={16} /> {commentOpen ? "Скрыть комментарии" : "Комментарии"}</button>
        {post.published_to_channel && <span className="published-label">Есть в Telegram</span>}
        {isOwner && <button className="post-action owner-delete" type="button" onClick={() => { if (window.confirm("Удалить эту публикацию и все её комментарии?")) onOwnerDelete(post.id); }}>Удалить</button>}
      </footer>
      {error && <p className="inline-error">{error}</p>}
      {commentOpen && <div className="comments-area">
        {comments.map((comment) => <div className="comment" key={comment.id}><strong>{commentAuthors.get(comment.author_id)?.display_name ?? "Студент"}</strong><RoleBadge role={commentAuthors.get(comment.author_id)?.role ?? "user"} /><p>{comment.content}</p><small>{formatTime(comment.created_at)}</small>{isOwner && <button className="post-action owner-delete" type="button" onClick={() => { if (window.confirm("Удалить комментарий?")) void deleteComment(comment.id); }}>Удалить комментарий</button>}</div>)}
        {user ? <form className="comment-form" onSubmit={(event) => void submitComment(event)}><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} maxLength={1000} placeholder="Написать комментарий…" /><button className="icon-button" aria-label="Отправить комментарий" type="submit"><Send size={16} /></button></form> : <button className="text-button" type="button" onClick={onNeedAuth}>Войдите, чтобы комментировать</button>}
      </div>}
    </article>
  );
}

function ChatPanel({ rooms, user, role, onNeedAuth }: { rooms: ChatRoom[]; user: User | null; role: CommunityRole; onNeedAuth: () => void }) {
  const [roomKey, setRoomKey] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<"message" | "listing">("message");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (rooms.length && !roomKey) setRoomKey(rooms[0].key);
  }, [rooms, roomKey]);

  useEffect(() => {
    const client = supabase;
    if (!client || !roomKey) return;
    let active = true;
    setMessages([]);
    void (async () => {
      const { data, error: queryError } = await client
        .from("community_chat_messages")
        .select("id, room_key, author_id, message_type, content, listing_title, listing_price, created_at")
        .eq("room_key", roomKey)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!active) return;
      if (queryError) {
        setError(queryError.message);
        return;
      }
      const rows = (data ?? []) as ChatMessage[];
      setMessages(rows);
      setAuthors(await getAuthors(rows.map((message) => message.author_id)));
    })();

    const channel = client
      .channel(`chat-${roomKey}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "community_chat_messages",
        filter: `room_key=eq.${roomKey}`,
      }, (payload) => {
        const message = payload.new as ChatMessage;
        if (!active) return;
        setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        void getAuthors([message.author_id]).then((map) => {
          setAuthors((current) => new Map([...current, ...map]));
        }).catch((authorError: unknown) => setError(authorError instanceof Error ? authorError.message : "Не удалось загрузить автора."));
      })
      .on("postgres_changes", {
        event: "DELETE",
        schema: "public",
        table: "community_chat_messages",
        filter: `room_key=eq.${roomKey}`,
      }, (payload) => {
        const deletedId = payload.old.id as string | undefined;
        if (deletedId) setMessages((current) => current.filter((message) => message.id !== deletedId));
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR") setError("Не удалось подключиться к live-чату. Проверьте Supabase Realtime.");
      });

    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [roomKey]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return onNeedAuth();
    if (!roomKey || sending) return;
    const content = draft.trim();
    if (kind === "message" && !content) return;
    if (kind === "listing" && title.trim().length < 3) {
      setError("Укажите название объявления (минимум 3 символа).");
      return;
    }
    const numericPrice = price.trim() ? Number(price) : null;
    if (numericPrice !== null && (!Number.isSafeInteger(numericPrice) || numericPrice < 0)) {
      setError("Цена должна быть целым числом от 0.");
      return;
    }

    setSending(true);
    setError("");
    const { data, error: insertError } = await requireBackend()
      .from("community_chat_messages")
      .insert({
        room_key: roomKey,
        author_id: user.id,
        message_type: kind,
        content,
        listing_title: kind === "listing" ? title.trim() : null,
        listing_price: kind === "listing" ? numericPrice : null,
      })
      .select("id, room_key, author_id, message_type, content, listing_title, listing_price, created_at")
      .single();

    if (insertError) setError(insertError.message);
    else {
      const message = data as ChatMessage;
      setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
      setAuthors((current) => new Map(current).set(user.id, {
        id: user.id,
        username: user.user_metadata.username ?? "",
        display_name: user.user_metadata.display_name ?? user.email ?? "Студент",
        role,
      }));
      setDraft("");
      setTitle("");
      setPrice("");
    }
    setSending(false);
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  async function deleteChatMessage(messageId: string) {
    if (role !== "owner" || !window.confirm("Удалить сообщение из чата?")) return;
    const { error: deleteError } = await requireBackend().rpc("owner_delete_chat_message", { target_id: messageId });
    if (deleteError) setError(deleteError.message);
    else setMessages((current) => current.filter((message) => message.id !== messageId));
  }

  const activeRoom = rooms.find((room) => room.key === roomKey);

  return (
    <section className="chat-surface surface">
      <div className="room-list">
        <h3>Комнаты</h3>
        {rooms.map((room) => <button key={room.key} className={room.key === roomKey ? "room-button selected" : "room-button"} type="button" onClick={() => setRoomKey(room.key)}>{room.name}</button>)}
        {rooms.length === 0 && <span className="muted">Комнаты появятся после настройки базы.</span>}
      </div>
      <div className="chat-main">
        <header className="chat-header"><div><h2>{activeRoom?.name ?? "Чат"}</h2><p>{activeRoom?.description ?? "Открытый чат студентов"}</p></div><span className="live-badge"><i /> Live</span></header>
        <div className="message-list" aria-live="polite">
          {messages.map((message) => <article className={message.message_type === "listing" ? "chat-message chat-listing" : "chat-message"} key={message.id}>
            <div className="message-meta"><span><strong>{authors.get(message.author_id)?.display_name ?? "Студент"}</strong> <RoleBadge role={authors.get(message.author_id)?.role ?? "user"} /></span><time>{formatTime(message.created_at)}</time></div>
            {message.message_type === "listing" && <div className="message-listing-title"><Store size={15} /> {message.listing_title}{message.listing_price !== null && <strong>{message.listing_price.toLocaleString("ru-RU")} ₴</strong>}</div>}
            {message.content && <p>{message.content}</p>}
            {role === "owner" && <button className="post-action owner-delete" type="button" onClick={() => void deleteChatMessage(message.id)}>Удалить сообщение</button>}
          </article>)}
          {!messages.length && <div className="empty-chat">Пока тихо. Напишите первое сообщение.</div>}
        </div>
        {error && <p className="inline-error">{error}</p>}
        {user ? <form className="chat-composer" onSubmit={(event) => void sendMessage(event)}>
          <div className="composer-tabs"><button type="button" className={kind === "message" ? "small-tab selected" : "small-tab"} onClick={() => setKind("message")}>Сообщение</button><button type="button" className={kind === "listing" ? "small-tab selected" : "small-tab"} onClick={() => setKind("listing")}>Объявление</button></div>
          {kind === "listing" && <div className="listing-fields"><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} placeholder="Название объявления" aria-label="Название объявления" /><input value={price} onChange={(event) => setPrice(event.target.value)} type="number" min="0" step="1" placeholder="Цена, ₴" aria-label="Цена" /></div>}
          <div className="composer-row"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onComposerKeyDown} maxLength={1000} rows={2} placeholder="Сообщение… Enter — отправить, Shift+Enter — новая строка" /><button className="primary-button send-button" type="submit" disabled={sending}><Send size={16} /> Отправить</button></div>
        </form> : <div className="chat-login"><span>Войдите, чтобы читать и отправлять сообщения.</span><button className="primary-button" type="button" onClick={onNeedAuth}>Войти</button></div>}
      </div>
    </section>
  );
}

function ListingComposer({ busy, signedIn, onSubmit, onNeedAuth }: { busy: boolean; signedIn: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onNeedAuth: () => void }) {
  return <form className="surface listing-composer" onSubmit={onSubmit}>
    <h2><Plus size={18} /> Разместить объявление</h2>
    <div className="listing-fields"><input name="title" required minLength={3} maxLength={100} placeholder="Название товара или услуги" /><input name="price" type="number" min="0" step="1" placeholder="Цена, ₴" /><select name="category" aria-label="Категория"><option value="books">Книги</option><option value="electronics">Электроника</option><option value="study">Учёба</option><option value="other">Другое</option></select></div>
    <textarea name="description" rows={2} maxLength={1000} placeholder="Описание, состояние, как связаться…" />
    <div className="listing-submit"><span className="muted small">Появится в каталоге после проверки</span><button className="primary-button" type="submit" disabled={busy}>{busy ? "Отправляем…" : "Отправить на модерацию"}</button></div>
    {!signedIn && <button className="composer-auth-hint" type="button" onClick={onNeedAuth}>Для публикации войдите в аккаунт</button>}
  </form>;
}

function ListingCard({ listing, author, isOwner, onOwnerDelete }: { listing: Listing; author?: Author; isOwner: boolean; onOwnerDelete: (id: string) => void }) {
  return <article className="surface listing-card">
    <div className="listing-art"><Store size={27} /></div>
    <div className="listing-card-body"><span className="category-pill">{listing.category}</span><h3>{listing.title}</h3>{listing.description && <p>{listing.description}</p>}<strong className="listing-price">{listing.price === null ? "Договорная" : `${listing.price.toLocaleString("ru-RU")} ₴`}</strong><div className="listing-seller"><span>@{author?.username ?? "студент"} {author && <RoleBadge role={author.role} />}</span>{listing.status !== "active" && <span className="pending-pill">{listing.status === "pending" ? "На проверке" : "Отклонено"}</span>}</div>{isOwner && <button className="post-action owner-delete" type="button" onClick={() => { if (window.confirm("Удалить объявление из барахолки?")) onOwnerDelete(listing.id); }}>Удалить объявление</button>}</div>
  </article>;
}

function AuthDialog({ mode, onClose, onModeChange, onNotice, onError }: { mode: AuthMode; onClose: () => void; onModeChange: (mode: AuthMode) => void; onNotice: (message: string) => void; onError: (message: string) => void }) {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFormError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    try {
      const client = requireBackend();
      if (mode === "sign-up") {
        const username = String(form.get("username") ?? "").trim().toLowerCase();
        const displayName = String(form.get("display_name") ?? "").trim();
        const { error: signUpError } = await client.auth.signUp({
          email,
          password,
          options: { data: { username, display_name: displayName } },
        });
        if (signUpError) throw signUpError;
        onNotice("Аккаунт создан. Если в Supabase включено подтверждение email, проверьте почту.");
        onClose();
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        onNotice("Вы вошли в аккаунт.");
        onClose();
      }
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : "Не удалось выполнить вход.";
      setFormError(message);
      onError("");
    } finally {
      setPending(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="auth-modal surface" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="modal-close icon-button" type="button" aria-label="Закрыть" onClick={onClose}><X size={18} /></button>
      <span className="eyebrow">СООБЩЕСТВО ЗИЕИТ</span>
      <h2 id="auth-title">{mode === "sign-up" ? "Создать аккаунт" : "С возвращением"}</h2>
      <p className="muted">{mode === "sign-up" ? "Регистрация нужна для чата, комментариев и объявлений." : "Войдите, чтобы общаться и публиковать."}</p>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        {mode === "sign-up" && <>
          <label className="field"><span>Имя</span><input name="display_name" autoComplete="name" required minLength={2} maxLength={48} /></label>
          <label className="field"><span>Логин</span><input name="username" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9._-]+" title="Латиница, цифры, точка, дефис или подчёркивание" /></label>
        </>}
        <label className="field"><span>Email</span><input name="email" type="email" autoComplete="email" required /></label>
        <label className="field"><span>Пароль</span><input name="password" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} required minLength={8} maxLength={128} /></label>
        {formError && <p className="inline-error" role="alert">{formError}</p>}
        {!isBackendConfigured && <p className="notice warning">Supabase пока не настроен.</p>}
        <button className="primary-button full-button" type="submit" disabled={pending || !isBackendConfigured}>{pending ? "Подождите…" : mode === "sign-up" ? "Зарегистрироваться" : "Войти"}</button>
      </form>
      <p className="auth-switch">{mode === "sign-up" ? "Уже зарегистрированы?" : "Ещё нет аккаунта?"} <button type="button" onClick={() => onModeChange(mode === "sign-up" ? "sign-in" : "sign-up")}>{mode === "sign-up" ? "Войти" : "Создать аккаунт"}</button></p>
    </section>
  </div>;
}

function EmptyCard({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="surface empty-card"><span className="empty-mark">З</span><h3>{title}</h3><p>{text}</p>{action}</div>;
}
