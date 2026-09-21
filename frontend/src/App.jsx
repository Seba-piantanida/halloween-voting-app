import React from 'react';
import AdminPage from './adminPage';
import VotingPage from './votingPage';

export default function App() {
  const path = window.location.pathname;

  if (path === '/admin') {
    return <AdminPage />;
  }

  if (path === '/') {
    return <VotingPage />;
  }

  return <h1>Pagina non trovata</h1>;
}
