#!/bin/bash

# Railway Konfiguration Setup Script
# Dieses Script wird NICHT auf GitHub hochgeladen und enthält Befehle zum Verwalten der Railway-Konfiguration

# Farben für Terminal-Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Überprüfen, ob Railway CLI installiert ist
echo -e "${YELLOW}Prüfe Railway CLI Installation...${NC}"
if ! command -v railway &> /dev/null; then
    echo -e "${RED}Railway CLI ist nicht installiert. Installiere jetzt...${NC}"
    npm install -g @railway/cli
else
    echo -e "${GREEN}Railway CLI ist bereits installiert.${NC}"
fi

# Anmelden bei Railway
echo -e "${YELLOW}Starte Anmeldeprozess für Railway...${NC}"
railway login

# Ordner erstellen, wenn er nicht existiert
mkdir -p railway-config

# Projekt verknüpfen
echo -e "${YELLOW}Verbinde mit Railway-Projekt...${NC}"
railway link

# Umgebungsvariablen speichern (ohne sensible Werte zu zeigen)
echo -e "${YELLOW}Speichere aktuelle Umgebungsvariablen...${NC}"
railway env > railway-config/env-variables.txt
echo -e "${GREEN}Umgebungsvariablen wurden in railway-config/env-variables.txt gespeichert.${NC}"

# Projekt-Status anzeigen
echo -e "${YELLOW}Aktueller Railway-Projektstatus:${NC}"
railway status

# Hauptmenü-Funktion
railway_menu() {
    clear
    echo -e "${GREEN}=== Railway Management Tool ===${NC}"
    echo -e "${YELLOW}1.${NC} Anwendung deployen (railway up)"
    echo -e "${YELLOW}2.${NC} Logs anzeigen"
    echo -e "${YELLOW}3.${NC} Status anzeigen"
    echo -e "${YELLOW}4.${NC} Umgebungsvariablen verwalten"
    echo -e "${YELLOW}5.${NC} Custom Domain hinzufügen"
    echo -e "${YELLOW}6.${NC} Beenden"
    
    read -p "Wähle eine Option (1-6): " choice
    
    case $choice in
        1)
            echo -e "${YELLOW}Starte Deployment...${NC}"
            railway up
            read -p "Drücke Enter, um fortzufahren..."
            railway_menu
            ;;
        2)
            echo -e "${YELLOW}Zeige Live-Logs an (Strg+C zum Beenden)${NC}"
            railway logs --live
            read -p "Drücke Enter, um fortzufahren..."
            railway_menu
            ;;
        3)
            echo -e "${YELLOW}Aktueller Status:${NC}"
            railway status
            read -p "Drücke Enter, um fortzufahren..."
            railway_menu
            ;;
        4)
            env_menu
            ;;
        5)
            read -p "Gib die Domain ein, die du hinzufügen möchtest: " domain
            echo -e "${YELLOW}Füge Domain hinzu: $domain${NC}"
            railway domain add $domain
            read -p "Drücke Enter, um fortzufahren..."
            railway_menu
            ;;
        6)
            echo -e "${GREEN}Railway Management Tool wird beendet.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Ungültige Option!${NC}"
            read -p "Drücke Enter, um fortzufahren..."
            railway_menu
            ;;
    esac
}

# Umgebungsvariablen-Menü
env_menu() {
    clear
    echo -e "${GREEN}=== Umgebungsvariablen-Verwaltung ===${NC}"
    echo -e "${YELLOW}1.${NC} Alle Umgebungsvariablen anzeigen"
    echo -e "${YELLOW}2.${NC} Neue Umgebungsvariable setzen"
    echo -e "${YELLOW}3.${NC} Zurück zum Hauptmenü"
    
    read -p "Wähle eine Option (1-3): " choice
    
    case $choice in
        1)
            echo -e "${YELLOW}Aktuelle Umgebungsvariablen:${NC}"
            railway env
            read -p "Drücke Enter, um fortzufahren..."
            env_menu
            ;;
        2)
            read -p "Name der Umgebungsvariable: " var_name
            read -p "Wert der Umgebungsvariable: " var_value
            echo -e "${YELLOW}Setze $var_name=$var_value${NC}"
            railway variables set "$var_name=$var_value"
            read -p "Drücke Enter, um fortzufahren..."
            env_menu
            ;;
        3)
            railway_menu
            ;;
        *)
            echo -e "${RED}Ungültige Option!${NC}"
            read -p "Drücke Enter, um fortzufahren..."
            env_menu
            ;;
    esac
}

# Kopiere das bestehende Railway-Setup in den sicheren Ordner
echo -e "${YELLOW}Kopiere vorhandenes Railway-Setup...${NC}"
cp /Users/denniswestermann/Desktop/Coding\ Projekte/aiEX_LeadPage/railway-setup.sh railway-config/railway-setup-original.sh
echo -e "${GREEN}Kopie des originalen Setup-Scripts wurde erstellt.${NC}"

# Starte das Menü
echo -e "${YELLOW}Drücke Enter, um das Railway Management Tool zu starten...${NC}"
read
railway_menu
