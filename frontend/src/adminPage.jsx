import React, { useEffect, useState } from "react";
import api from "./api";
import CostumeSlimCard from "./components/CostumeSlimCard";
import AddCostumeModal from "./components/AddCostumeModal";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem("token"));
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [votingStatus, setVotingStatus] = useState("");
  const [costumes, setCostumes] = useState([]);
  const [showAddCostumeModal, setShowAddCostumeModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [ranking, setRanking] = useState(null);
  const [rankingError, setRankingError] = useState("");
  const [isDeletingVotes, setIsDeletingVotes] = useState(false);

  useEffect(() => {
    fetchStatus();
    fetchCostumes();
  }, []);

  const fetchStatus = async () => {
    try {
      const { data } = await api.get("/status");
      setVotingStatus(data.status);
    } catch {
      alert("Errore nel recupero dello stato delle votazioni.");
    }
  };

  const fetchCostumes = async () => {
    try {
      const { data } = await api.get("/costumes");
      setCostumes(data.costumes || []);
    } catch {
      console.error("Errore nel recupero dei costumi");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const { data } = await api.post("/admin/login", { username, password });
      localStorage.setItem("token", data.access_token);
      setIsAdmin(true);
      setShowLogin(false);
      alert("Login effettuato come Admin!");
    } catch {
      alert("Credenziali errate");
    }
  };

  const handleAddCostume = async (name, photo) => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("photo", photo, photo.name || "costume.jpg");
    setIsUploading(true);
    try {
      await api.post("/admin/costumes", formData);
      await fetchCostumes();
      setShowAddCostumeModal(false);
      alert("Costume aggiunto con successo!");
    } catch (error) {
      alert(error.response?.data?.detail || "Errore nel caricamento del costume.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleVotingStatus = async () => {
    const isOpen = votingStatus === "APERTA";
    try {
      const { data } = await api.post(isOpen ? "/admin/stop-voting" : "/admin/start-voting");
      setVotingStatus(data.status);
    } catch {
      alert("Errore nella modifica dello stato delle votazioni.");
    }
  };

  const handleShowRanking = async () => {
    setRankingError("");
    try {
      await api.post("/admin/publish-results");
      setVotingStatus("RISULTATI");
      const { data } = await api.get("/admin/ranking");
      setRanking(data.ranking || []);
    } catch (error) {
      setRankingError(error.response?.data?.detail || "Impossibile caricare la classifica.");
    }
  };

  const handleDeleteAllVotes = async () => {
    if (!window.confirm("Vuoi cancellare tutti i voti registrati? L’azione non può essere annullata.")) return;
    setIsDeletingVotes(true);
    try {
      await api.delete("/admin/votes");
      setRanking(null);
      setRankingError("");
      alert("Tutti i voti sono stati cancellati.");
    } catch (error) {
      alert(error.response?.data?.detail || "Impossibile cancellare i voti.");
    } finally {
      setIsDeletingVotes(false);
    }
  };

  const handleDeleteCostume = async (id) => {
    try {
      await api.delete(`/admin/costumes/${id}`);
      fetchCostumes();
    } catch (error) {
      alert(error.response?.data?.detail || "Impossibile eliminare il costume.");
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>🎃 Pannello Admin</h1>
        {!isAdmin && <button className="admin-secondary-button" onClick={() => setShowLogin((visible) => !visible)}>Accedi</button>}
      </header>
      <main className="admin-card">
        {!isAdmin ? (
          showLogin && <form onSubmit={handleLogin}>
            <h3>Accesso Admin</h3>
            <input className="input-field" type="text" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" required />
            <input className="input-field" type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            <button className="btn-submit" type="submit">Accedi</button>
          </form>
        ) : (
          <>
            <div className="admin-actions">
              <button className="btn-submit" onClick={() => setShowAddCostumeModal(true)}>＋ Aggiungi costume</button>
              <button className="admin-secondary-button" onClick={handleVotingStatus}>
                {votingStatus === "APERTA" ? "Interrompi votazioni" : "Avvia votazioni"}
              </button>
              <button className="admin-ranking-button" onClick={handleShowRanking}>🏆 Mostra classifica</button>
              <button className="admin-secondary-button" onClick={handleDeleteAllVotes} disabled={isDeletingVotes}>
                {isDeletingVotes ? "Cancellazione…" : "🗑️ Cancella tutti i voti"}
              </button>
            </div>
            <p className="admin-voting-status">Stato votazioni: <strong>{votingStatus || "…"}</strong></p>

            {rankingError && <p className="admin-error" role="alert">{rankingError}</p>}
            {ranking && <section className="admin-ranking" aria-live="polite">
              <h2>🏆 Classifica</h2>
              {ranking.length ? ranking.map((entry, index) => (
                <div className="admin-ranking-row" key={entry.id}>
                  <span className="admin-ranking-place">{index + 1}°</span>
                  {entry.image_url && <img src={entry.image_url} alt="" />}
                  <strong>{entry.name}</strong>
                  <span>{entry.score} punti</span>
                </div>
              )) : <p>Nessun voto registrato.</p>}
            </section>}

            <section className="admin-costume-list">
              <h2>Costumi caricati <span>{costumes.length}</span></h2>
              <div className="costumes-list-conteiner">
                {costumes.length === 0 ? <p>Nessun costume caricato.</p> : costumes.map((costume) => (
                  <CostumeSlimCard key={costume.id} costume={costume} onDelete={handleDeleteCostume} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      {showAddCostumeModal && <AddCostumeModal onClose={() => setShowAddCostumeModal(false)} onSubmit={handleAddCostume} isSubmitting={isUploading} />}
    </div>
  );
}
