import React from "react";
import "./CostumeCard.css"
import goldCrown from "../../assets/Gold.png";
import silverCrown from "../../assets/Silver.png";
import bronzeCrown from "../../assets/Bronze.png";

export default function CostumeCard(
    {costume, crownType}
) {
    const crownImages = { gold: goldCrown, silver: silverCrown, bronze: bronzeCrown };
    return (
        <div className={`CostumeCard${crownType ? ` has-crown crown-${crownType}` : ''}`}>
            {crownType && <img className="costume-crown" src={crownImages[crownType]} alt={`Corona ${crownType}`} />}
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
