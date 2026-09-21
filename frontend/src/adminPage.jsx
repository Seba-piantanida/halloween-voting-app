import React from "react";
import { useState } from "react";
import { useEffect } from "react";
import api from "./api";


export default function AdminPage (){
    // Stato Admin
    const [isAdmin, setIsAdmin] = useState(!!localStorage.getItem('token'));
    const [showLogin, setShowLogin] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [newCostumeName, setNewCostumeName] = useState('');
    const [votingStatus, setVotingStatus] = useState('')
    const [newCostumePhoto, setNewCostumePhoto] = useState(null);

    useEffect(() => {
            fetchStatus();
        }, []);

    const fetchStatus = async () => {
      try {
        const res = await api.get('/status');
        setVotingStatus(res.data.status);

      } catch (err){
        alert('errore nel recupero dello stato')
      }

    };
    // Login Admin

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/login', { username, password });
      localStorage.setItem('token', res.data.access_token);
      setIsAdmin(true);
      setShowLogin(false);
      alert("Login effettuato come Admin!");
    } catch (err) {
      alert("Credenziali errate");
    }
  };

  // Aggiungi Costume (Admin)
  const handleAddCostume = async (e) => {
    e.preventDefault();
    if (!newCostumeName || !newCostumePhoto) {
      console.log('errore nel aggiungere il costume')
    }

    const formData = new FormData();
    formData.append('name', newCostumeName);
    formData.append('photo', newCostumePhoto);

    try {
      await api.post('/admin/costumes', formData);
      setNewCostumeName('');
      setNewCostumePhoto(null);
      alert("Costume aggiunto con successo!");
    } catch (err) {
      alert("Errore nel caricamento del costume");
    }
  };

  // Switch Avvia/Interrompi Votazioni (Admin)
  const handleOpenVoting = async () => {
    try {
      const res = await api.post('/admin/start-voting');
      setVotingStatus('APERTA');
      console.log(votingStatus)
      
    } catch (err) {
      alert("Errore nella modifica dello stato delle votazioni");
    }
  };

  const handleCloseVoting = async () => {
    try {
      const res = await api.post('/admin/stop-voting');
      setVotingStatus('CHIUSA');
      console.log(votingStatus)
      
    } catch (err) {
      alert("Errore nella modifica dello stato delle votazioni");
    }
  };
    
  return (
    <div className="admin-card">
        {!isAdmin ? (
        <form onSubmit={handleLogin}>
            <h3>Accesso Admin</h3>
            <input
            className="input-field"
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            />
            <input
            className="input-field"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            />
            <button className="btn-submit" type="submit">Accedi</button>
        </form>
        ) : (
        <div>
            <h3>Pannello di Controllo Admin</h3>
            <button
            className="btn-submit"
            style={{ backgroundColor: votingStatus == 'APERTA' ? '#d9534f' : '#5cb85c', marginBottom: '15px' }}
            onClick={votingStatus == 'APERTA' ? handleCloseVoting : handleOpenVoting}
            >
            {votingStatus == 'APERTA' ? 'Interrompi Votazioni' : 'Avvia Votazioni'}
            </button>

            <h4>Aggiungi Nuovo Costume</h4>
            <form onSubmit={handleAddCostume}>
            <input
                className="input-field"
                type="text"
                placeholder="Nome Costume / Partecipante"
                value={newCostumeName}
                onChange={e => setNewCostumeName(e.target.value)}
            />
            <input
                className="input-field"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => setNewCostumePhoto(e.target.files[0])}
            />
            <button className="btn-submit" type="submit" onClick={ handleAddCostume}> Carica Costume</button>
            </form>
        </div>
        )}
    </div>
  );
      
}