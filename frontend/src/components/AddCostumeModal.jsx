import React, { useEffect, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";
import "./AddCostumeModal.css";

export default function AddCostumeModal({ onClose, onSubmit, isSubmitting = false }) {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPreview("");
      return undefined;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !photo) {
      setError("Inserisci il nome e scegli o scatta una foto.");
      return;
    }
    setError("");
    await onSubmit(name.trim(), photo);
  };

  return (
    <div className="add-costume-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="add-costume-modal" role="dialog" aria-modal="true" aria-labelledby="add-costume-title">
        <button className="close-button" type="button" onClick={onClose} aria-label="Chiudi" disabled={isSubmitting}>
          <X size={20} />
        </button>
        <div className="add-costume-heading">
          <span className="add-costume-icon"><ImagePlus size={22} /></span>
          <div>
            <h2 id="add-costume-title">Nuovo costume</h2>
            <p>Aggiungi il nome e una foto del partecipante.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="add-costume-label" htmlFor="costume-name">Nome costume / partecipante</label>
          <input id="costume-name" className="input-field" type="text" placeholder="Es. Strega…" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
          <label className="add-costume-label" htmlFor="costume-photo">Foto</label>
          {preview ? (
            <div className="costume-photo-preview">
              <img src={preview} alt="Anteprima del costume" />
              <button type="button" onClick={() => setPhoto(null)}>Scegli un'altra foto</button>
            </div>
          ) : (
            <div className="photo-actions">
              <label className="photo-choice" htmlFor="costume-camera"><Camera size={20} /><span>Scatta una foto</span></label>
              <label className="photo-choice" htmlFor="costume-gallery"><ImagePlus size={20} /><span>Scegli dalla galleria</span></label>
              <input id="costume-camera" className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
              <input id="costume-gallery" className="visually-hidden" type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
            </div>
          )}
          {error && <p className="modal-error" role="alert">{error}</p>}
          <button className="btn-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? "Caricamento…" : "Aggiungi costume"}</button>
        </form>
      </section>
    </div>
  );
}
