
import React from "react";
import { useState } from "react";
import { useEffect } from "react";
import api from "./api";
import { ChevronLeft, ChevronRight, Check, Trophy } from 'lucide-react';
import {Swiper, SwiperSlide} from 'swiper/react';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import { EffectCoverflow, Pagination } from 'swiper/modules';
import CostumeCard from "./components/CostumeCard";
import CrownButton from "./components/CrownButton";
import './votingPage.css'

export default function VotingPage (){
    const [costumes, setCostumes] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [votingStatus, setVotingStatus] = useState("UNKNOWN");
    const [hasVoted, setHasVoted] = useState(false);
    const [results, setResults] = useState([]);

    // Stato corone: costumeId assegnato a ciascuna corona
    const [crowns, setCrowns] = useState({ gold: null, silver: null, bronze: null });


    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const res = await api.get('/status');
            setVotingStatus(res.data.status);
            const status = res.data.status;
            console.log(status);

            if (status == 'APERTA'){
                fetchData();
            }
            
            if (status == 'RISULTATI'){
                fetchResults();
            }


        } catch (err) {
            console.error("Errore nel recupero dello stato")
        }
    };

    const fetchData = async () => {
        try {
        const res = await api.get('/costumes');
        setCostumes(res.data.costumes || []);
 
        } catch (err) {
        console.error("Errore nel caricamento dati", err);
        }
    };

    const fetchResults = async () => {
        try {
        const res = await api.get('/results');
        setResults(res.data.results || []);
        } catch (err) {
        console.error("Errore nel caricamento risultati", err);
        }
    };

    // Assegnazione o rimozione corona
    const handleAssignCrown = (costumeId, type) => {
        if (hasVoted || !votingActive) return;

        setCrowns(prev => {
        // Se il costume ha già questa corona, la rimuoviamo
        if (prev[type] === costumeId) {
            return { ...prev, [type]: null };
        }
        // Altrimenti rimuoviamo il costume da altre corone se presente
        const newCrowns = { ...prev };
        Object.keys(newCrowns).forEach(k => {
            if (newCrowns[k] === costumeId) newCrowns[k] = null;
        });
        newCrowns[type] = costumeId;
        return newCrowns;
        });
    };

    // Invio del voto
    const handleSubmitVote = async () => {
        if (!crowns.gold && !crowns.silver && !crowns.bronze) {
        alert("Assegna almeno una corona prima di confermare!");
        return;
        }

        try {
        await api.post('/vote', {
            gold_costume_id: crowns.gold,
            silver_costume_id: crowns.silver,
            bronze_costume_id: crowns.bronze
        });
        setHasVoted(true);
        alert("Voto registrato con successo! 🎃");
        } catch (err) {
        alert(err.response?.data?.detail || "Errore nell'invio del voto");
        }
    };

    

    const currentCostume = costumes[currentIndex];

    return (
        <div className="app-container">
        {/* Header Mobile */}
        <header className="app-header">
            <h1 className="app-title">🎃 Costume più bellino</h1>
        
        </header>

        <main className="main-content">
        

            {/* SCHERMATA VINCITORI (SE VOTAZIONI CHIUSE) */}
            {votingStatus == 'RISULTATI' && results.length > 0 && (
            <div className="podium-container">
                <h2 style={{ fontFamily: 'var(--font-spooky)', color: 'var(--gold)', fontSize: '2rem' }}>
                🏆 Il Podio dei Vincitori
                </h2>
                <div className="podium-stage">
                {/* 2° Posto */}
                {results[1] && (
                    <div className="podium-place second">
                    <img className="podium-img" src={results[1].image_url} alt={results[1].name} />
                    <span>🥈 {results[1].name}</span>
                    <div className="podium-block">2°</div>
                    </div>
                )}
                {/* 1° Posto */}
                {results[0] && (
                    <div className="podium-place first">
                    <img className="podium-img" src={results[0].image_url} alt={results[0].name} />
                    <span>🥇 {results[0].name}</span>
                    <div className="podium-block">1°</div>
                    </div>
                )}
                {/* 3° Posto */}
                {results[2] && (
                    <div className="podium-place third">
                    <img className="podium-img" src={results[2].image_url} alt={results[2].name} />
                    <span>🥉 {results[2].name}</span>
                    <div className="podium-block">3°</div>
                    </div>
                )}
                </div>
            </div>
            )}
          

            {/* SCHERMATA CAROSELLO VOTAZIONI (SE VOTAZIONI ATTIVE) */}
            {votingStatus == 'APERTA' && costumes.length > 0 && (
            <div className="carousel-container">
                {hasVoted ? (
                <div style={{ textAlign: 'center', padding: '40px 10px' }}>
                    <Trophy size={64} color="var(--gold)" style={{ marginBottom: '16px' }} />
                    <h2>Voto inviato con successo!</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
                    Attendi che l'admin termini le votazioni per scoprire i vincitori sul podio!
                    </p>
                </div>
                ) : (
                <>
                    <Swiper
                        effect={'coverflow'}
                        grabCursor={true}
                        centeredSlides={true}
                        slidesPerView={'auto'}
                        coverflowEffect={{
                        rotate: 50,
                        stretch: 0,
                        depth: 100,
                        modifier: 1,
                        }}
                        
                        modules={[EffectCoverflow, Pagination]}
                        className="mySwiper">
                    {costumes.map(costume => (
                        <SwiperSlide
                        key={costume.id}>
                             <CostumeCard
                                      
                                      costume={costume}
                                      
                                    />

                        </SwiperSlide>
                                   
                                  ))}</Swiper>
                    
                    

                  
                </>
                )}
            </div>
            
            )}

            {votingStatus == 'APERTA' && costumes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                Nessun costume presente. L'admin deve ancora caricare le foto dei partecipanti!
            </div>
            )}
             {votingStatus == 'NON_INIZIATA' && costumes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                la votazione non è ancora stata avviata!
            </div>
            )}
             {votingStatus == 'CHIUSA' && (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                la votazione è stata chiusa, resta in attesa di scoprire i risultati!
            </div>
            )}
            <div className="voting-buttons">
                <CrownButton variant='silver' />
                <CrownButton cariant='gold'/>
                
                <CrownButton variant="bronze" />
            </div>
            <div className="pulsanti-voto">
                <button className="confermavoto">
                    Conferma
                </button>

            </div>
            
            
            
            
        </main>
        </div>
    );
}