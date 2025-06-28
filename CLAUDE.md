# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GoAIX** - AI-Lead-Magnet-Plattform deployed at quiz.goaiex.com
- **Frontend URL**: https://quiz.goaiex.com
- **API URL**: https://api.quiz.goaiex.com  
- **Admin Panel**: https://admin.quiz.goaiex.com
- **Campaign URLs**: quiz.goaiex.com/campaign/[slug]

## 🚨 CRITICAL RULES & GUIDELINES

### RULE 1: NO MOCK DATA - EVER!
**ABSOLUTELY FORBIDDEN**: Mock data, demo content, or simulated API responses
- **Always use live backend data**
- **Never implement mock functions or demo content**
- **Mock data causes confusion, debugging issues, and masks real problems**
- **Historical incident (28.06.2025)**: Mock data prevented AI-testing system from working and caused major debugging confusion for hours
- **New Memory (28.06.2025)**: Okay, schau dir ab jetzt jedes Mal immer erst die debug infos an bevor du etwas änderst!!

### Implementation Requirements:
- Remove any `MOCK_DATA_ENABLED` flags
- Delete all mock functions immediately
- Always call real backend APIs
- Use real database data only

[Rest of the file remains the same...]