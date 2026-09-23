import React from "react";
import { Trash2 } from 'lucide-react';

export default function CostumeSlimCard({
    costume,
    onDelete,
    isDeleting = false,
  }){

    return (
        <article className="costume-slim-card">
            <div style={{ display: "flex", alignItems: "center", gap : "10px" }}>
                <img
                className="costume-slim-card-foto"
                src={costume.image_url}
                alt={costume.name}>
                </img>
                <h2 className="costume-slim-card-title">
                    {costume.name}
                </h2>
            </div>
            
            <button
            type="button"
            onClick={ () => onDelete(costume.id)}>
                <Trash2 size={30} color="red" enableBackground={false} />
            </button>
        </article>
    );
    

}