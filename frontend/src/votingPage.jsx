import React, { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import { EffectCoverflow, Pagination } from "swiper/modules";
import api from "./api";
import CostumeCard from "./components/CostumeCard";
import CrownButton from "./components/CrownButton";
import "./votingPage.css";

const EMPTY_CROWNS = { gold: null, silver: null, bronze: null };

const HAS_VOTED_COOKIE = "has_voted";
const PODIUM_REVEALED_COOKIE = "podium_revealed";

const checkHasVotedCookie = () => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((row) => row.startsWith(`${HAS_VOTED_COOKIE}=`));
};

const setHasVotedCookie = () => {
  if (typeof document === "undefined") return;
  const maxAge = 365 * 24 * 60 * 60; // 1 anno
  document.cookie = `${HAS_VOTED_COOKIE}=true; max-age=${maxAge}; path=/; SameSite=Lax`;
};

const checkPodiumRevealedCookie = () => {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((row) => row.startsWith(`${PODIUM_REVEALED_COOKIE}=true`));
};

const setPodiumRevealedCookie = () => {
  if (typeof document === "undefined") return;
  const maxAge = 365 * 24 * 60 * 60; // 1 anno
  document.cookie = `${PODIUM_REVEALED_COOKIE}=true; max-age=${maxAge}; path=/; SameSite=Lax`;
};

export default function VotingPage() {
  const [costumes, setCostumes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votingStatus, setVotingStatus] = useState("UNKNOWN");
  const [hasVoted, setHasVoted] = useState(() => checkHasVotedCookie());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState("");
  const [results, setResults] = useState([]);
  const [crowns, setCrowns] = useState(EMPTY_CROWNS);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get("/status");
      setVotingStatus(data.status);

      if (data.status === "APERTA") {
        await fetchCostumes();
      } else if (data.status === "RISULTATI") {
        await fetchResults();
      }
    } catch {
      setVoteError("Impossibile contattare il server. Riprova tra poco.");
    }
  };

  const fetchCostumes = async () => {
    const { data } = await api.get("/costumes");
    const nextCostumes = data.costumes || [];
    setCostumes(nextCostumes);
    setCurrentIndex((index) => Math.min(index, Math.max(nextCostumes.length - 1, 0)));
  };

  const fetchResults = async () => {
    const { data } = await api.get("/results");
    setResults(data.results || []);
  };

  const assignedCount = useMemo(
    () => Object.values(crowns).filter((costumeId) => costumeId !== null).length,
    [crowns],
  );
  const currentCostume = costumes[currentIndex];

  const handleAssignCrown = (costumeId, type) => {
    if (hasVoted || isSubmitting || votingStatus !== "APERTA" || !costumeId) return;

    setVoteError("");
    const costumeAlreadyAwarded = Object.entries(crowns).some(
      ([otherType, assignedId]) => otherType !== type && assignedId === costumeId,
    );
    if (costumeAlreadyAwarded) {
      setVoteError("Ogni costume può ricevere una sola corona.");
      return;
    }

    setCrowns((previous) => {
      if (previous[type] === costumeId) {
        return { ...previous, [type]: null };
      }
      return { ...previous, [type]: costumeId };
    });
  };

  const handleSubmitVote = async () => {
    if (assignedCount === 0 || isSubmitting || hasVoted || checkHasVotedCookie()) return;

    setIsSubmitting(true);
    setVoteError("");
    try {
      await api.post("/vote", {
        gold_costume_id: crowns.gold,
        silver_costume_id: crowns.silver,
        bronze_costume_id: crowns.bronze,
      });
      setHasVotedCookie();
      setHasVoted(true);
    } catch (error) {
      setVoteError(
        error.response?.data?.detail || "Errore durante l'invio del voto. Riprova.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">🎃 Costume più bellino</h1>
      </header>

      <main className={`main-content${votingStatus === "RISULTATI" ? " results-main" : ""}`}>
        {voteError && (
          <p role="alert" style={{ color: "#ff9d9d", textAlign: "center", padding: "0 16px" }}>
            {voteError}
          </p>
        )}

        {votingStatus === "RISULTATI" && results.length > 0 && (
          <Podium results={results} />
        )}

        {votingStatus === "APERTA" && hasVoted && (
          <div className="carousel-container">
            <div style={{ textAlign: "center", padding: "40px 10px" }}>
              <img className= 'zucca-lupo' src="../assets/zucca_lupo.png" alt="" />
              <h2>Grazie per aver partecipato!</h2>
              <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
                Hai espresso il tuo voto. <br />
                 Attendi la pubblicazione dei risultati per scoprire i vincitori.
              </p>
            </div>
          </div>
        )}

        {votingStatus === "APERTA" && !hasVoted && costumes.length > 0 && (
          <div className="carousel-container voting-carousel">
            <Swiper
              effect="coverflow"
              grabCursor
              centeredSlides
              slidesPerView="auto"
              coverflowEffect={{ rotate: 50, stretch: 0, depth: 100, modifier: 1 }}
              modules={[EffectCoverflow, Pagination]}
              onSlideChange={(swiper) => setCurrentIndex(swiper.realIndex)}
              className="mySwiper voting-costumes-swiper"
            >
              {costumes.map((costume) => (
                <SwiperSlide key={costume.id}>
                  <CostumeCard
                    costume={costume}
                    crownType={Object.keys(crowns).find((type) => crowns[type] === costume.id)}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        )}

        {votingStatus === "APERTA" && !hasVoted && costumes.length === 0 && (
          <StatusMessage>Nessun costume presente. L'admin deve ancora caricare le foto.</StatusMessage>
        )}
        {votingStatus === "NON_INIZIATA" && (
          <StatusMessage>La votazione non è ancora stata avviata.</StatusMessage>
        )}
        {votingStatus === "CHIUSA" && (
          <div className="carousel-container">
            <div style={{ textAlign: "center", padding: "40px 10px" }}>
              <img className= 'zucca-nuda' src="../assets/zucca_nuda.png" alt="" />
              <h1>OOPS!!!</h1>
              <h2>Non c'è ancora niente da vedere qui!</h2>
              <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
                La votazione non è ancora stata aperta, ritorna più tardi
              </p>
            </div>
          </div>
        )}

        {votingStatus === "APERTA" && currentCostume && !hasVoted && (
          <div>
          <div className="voting-buttons" aria-label="Assegna una corona al costume visualizzato">
            <CrownButton
              variant="silver"
              active={crowns.silver === currentCostume.id}
              assignedElsewhere={crowns.silver !== null && crowns.silver !== currentCostume.id}
              disabled={isSubmitting}
              onClick={() => handleAssignCrown(currentCostume.id, "silver")}
            />
            <CrownButton
              variant="gold"
              active={crowns.gold === currentCostume.id}
              assignedElsewhere={crowns.gold !== null && crowns.gold !== currentCostume.id}
              disabled={isSubmitting}
              onClick={() => handleAssignCrown(currentCostume.id, "gold")}
            />
            <CrownButton
              variant="bronze"
              active={crowns.bronze === currentCostume.id}
              assignedElsewhere={crowns.bronze !== null && crowns.bronze !== currentCostume.id}
              disabled={isSubmitting}
              onClick={() => handleAssignCrown(currentCostume.id, "bronze")}
            />
          </div>
          {crowns.gold !== null && <button
            className="btn-icon confirm-vote"
            onClick={handleSubmitVote}
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            aria-label="Conferma voto"
            title="Conferma voto"
          >
            <Check aria-hidden="true" size={21} strokeWidth={3} />
            <span>{isSubmitting ? "Invio…" : "Conferma voto"}</span>
          </button>}
          </div>
        )}
      </main>
    </div>
  );
}

function Podium({ results }) {
  const [revealed, setRevealed] = useState(() => checkPodiumRevealedCookie());
  const [zoomedCostume, setZoomedCostume] = useState(null);
  const winner = results[0];
  const secondPlace = results[1];
  const thirdPlace = results[2];

  const revealPodium = () => {
    setPodiumRevealedCookie();
    setRevealed(true);
  };

  const confetti = Array.from({ length: 42 }, (_, index) => ({
    left: `${(index * 37 + 7) % 100}%`,
    delay: `${-((index * 13) % 90) / 10}s`,
    duration: `${7 + (index % 8) * 0.7}s`,
    drift: `${((index * 19) % 120) - 60}px`,
    color: ["#ffd700", "#ff7518", "#c77dff", "#57e3c1", "#f5f2ff"][index % 5],
    shape: index % 3 === 0 ? "circle" : "rectangle",
  }));

  return (
    <>
    <section className="podium-container" aria-labelledby="podium-title">
      <div className="podium-confetti" aria-hidden="true">
        {confetti.map((piece, index) => (
          <span
            key={index}
            className={`confetti-piece confetti-${piece.shape}`}
            style={{ "--confetti-left": piece.left, "--confetti-delay": piece.delay, "--confetti-duration": piece.duration, "--confetti-drift": piece.drift, "--confetti-color": piece.color }}
          />
        ))}
      </div>
      <header className={`podium-heading${revealed ? " is-revealed" : ""}`}>
        <span className="podium-eyebrow">La votazione è conclusa</span>
        <h2 id="podium-title">Il podio dei vincitori</h2>
        <p>Ecco i costumi più votati 🎃</p>
      </header>
      <div className={`podium-presentation${revealed ? " is-revealed" : " is-covered"}`}>
        <div className="podium-stage podium-stage-reveal" aria-hidden={!revealed}>
          {secondPlace && <PodiumPlace result={secondPlace} place="second" number="2°" onCostumeClick={setZoomedCostume} />}
          {winner && <PodiumPlace result={winner} place="first" number="1°" onCostumeClick={setZoomedCostume} />}
          {thirdPlace && <PodiumPlace result={thirdPlace} place="third" number="3°" onCostumeClick={setZoomedCostume} />}
        </div>
        <button className={`mystery-card${revealed ? " is-exploding" : ""}`} onClick={revealPodium} disabled={revealed} aria-label="Tocca per scoprire il podio" aria-hidden={revealed}>
          <span className="mystery-question" aria-hidden="true">?</span>
          <span className="mystery-title">Tocca per scoprire</span>
          <span className="mystery-hint">Il podio ti aspetta</span>
        </button>
        {revealed && <div className="confetti-burst" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ "--burst-index": index }} />)}</div>}
      </div>
    </section>
    {zoomedCostume && <CostumeZoom costume={zoomedCostume} onClose={() => setZoomedCostume(null)} />}
    </>
  );
}

function PodiumPlace({ result, place, number, spotlight = false, onCostumeClick }) {
  const crownType = { first: "gold", second: "silver", third: "bronze" }[place];
  const openCostume = () => onCostumeClick?.(result);
  return (
    <article className={`podium-place ${place}${spotlight ? " spotlight" : ""}`}>
      <div className="podium-card-wrap" role={onCostumeClick ? "button" : undefined} tabIndex={onCostumeClick ? 0 : undefined} onClick={openCostume} onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCostume();
        }
      }} aria-label={onCostumeClick ? `Apri la foto di ${result.name}` : undefined}>
        <CostumeCard costume={result} crownType={crownType} />
      </div>
      <div className="podium-block"><span>{number}</span></div>
    </article>
  );
}

function CostumeZoom({ costume, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="costume-zoom-overlay" onClick={onClose} role="presentation">
      <figure className="costume-zoom" role="dialog" aria-modal="true" aria-label={`Foto di ${costume.name}`} onClick={(event) => event.stopPropagation()}>
        <button className="costume-zoom-close" type="button" onClick={onClose} aria-label="Chiudi immagine">×</button>
        <img src={costume.image_url} alt={costume.name} />
        <figcaption>{costume.name}</figcaption>
      </figure>
    </div>
  );
}

function StatusMessage({ children }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 10px", color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}
