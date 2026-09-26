import React from "react";
import "./CostumeCard.css"

export default function CostumeCard(
    {costume}
) {
    return (
        <div className="CostumeCard">
            <div className="costume-photo">
                <img
            src={costume.image_url}
            alt="foto-costume">
            </img>
            </div>
            <h1>
                {costume.name}
            </h1>
        </div>  
    )
}