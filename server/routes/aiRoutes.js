const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

/**
 * AI Routes
 */

// Personality profiling
router.post('/profile', aiController.generatePersonalityProfile);

// Recommendations
router.post('/recommendations', aiController.generateRecommendations);

// Multi-modal analysis
router.post('/analyze-photos', aiController.analyzeUserPhotos);
router.post('/analyze-text', aiController.analyzeUserText);

// Behavioral pattern recognition
router.post('/behavioral-patterns', aiController.analyzeBehavioralPatterns);

// Travel archetype classification
router.post('/travel-archetype', aiController.classifyTravelArchetype);

// Predictive travel intent
router.post('/predict-intent', aiController.predictTravelIntent);

// Contextual factors
router.post('/contextual-factors', aiController.getContextualFactors);

module.exports = router;
