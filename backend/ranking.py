from config import SCORING

def computeRanking(costumes: list) -> list:
    """
    Calcola il ranking dei costumi in base ai voti ricevuti.
    
    Args:
        costumes (dict): Dizionario contenente i costumi e i loro voti.
        
    Returns:
        dict: Dizionario con i costumi ordinati per punteggio totale.
    """
    ranking = []
    
    for costume in costumes:
        total_score =   costume['gold_count'] * SCORING[GOLD] + costume['silver_count'] * SCORING[SILVER] + costume['bronze_count'] * SCORING[BRONZE]
        
        ranking.append({"costume_id": costume["id"],
                        "costume_name": costume['name'],
                        'image_url': costume['image_url'],
                        "score": total_score})

    return ranking

        
