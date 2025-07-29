const aiService = require('../services/aiService');

/**
 * AI Controller for handling AI-related requests
 */
class AIController {
  /**
   * Generate AI-powered personality profile
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async generatePersonalityProfile(req, res) {
    try {
      const { userId, userData } = req.body;

      if (!userId || !userData) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: userId and userData'
        });
      }

      const profile = await aiService.generatePersonalityProfile(userData);
      
      // Store profile in database
      await aiService.storeUserProfile(userId, {
        personalityTraits: profile
      });

      res.json({
        success: true,
        profile
      });
    } catch (error) {
      console.error('Error generating personality profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate personality profile',
        error: error.message
      });
    }
  }

  /**
   * Generate AI-powered travel recommendations
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async generateRecommendations(req, res) {
    try {
      const { userId, userProfile, context } = req.body;

      if (!userId || !userProfile) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: userId and userProfile'
        });
      }

      const recommendations = await aiService.generateRecommendations(userProfile, context || {});
      
      // Store recommendations in database
      if (recommendations && !recommendations.error) {
        await aiService.storeRecommendations(userId, recommendations);
      }

      res.json({
        success: true,
        recommendations
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate recommendations',
        error: error.message
      });
    }
  }

  /**
   * Analyze user photos to determine preferences
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async analyzeUserPhotos(req, res) {
    try {
      const { userId, userImages } = req.body;

      if (!userId || !userImages || !Array.isArray(userImages)) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: userId and userImages array'
        });
      }

      const preferences = await aiService.analyzeUserPhotos(userImages);
      
      // Store insights
      if (preferences && !preferences.error) {
        await aiService.storeInsight(
          userId,
          'photo_preferences',
          preferences,
          preferences.confidence || 75
        );
      }

      res.json({
        success: true,
        preferences
      });
    } catch (error) {
      console.error('Error analyzing user photos:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze user photos',
        error: error.message
      });
    }
  }

  /**
   * Analyze user text (notes and reviews)
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async analyzeUserText(req, res) {
    try {
      const { userId, userNotes, reviews } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: userId'
        });
      }

      const analysis = await aiService.analyzeUserText(userNotes, reviews);
      
      // Store insights
      if (analysis && !analysis.error) {
        await aiService.storeInsight(
          userId,
          'text_analysis',
          analysis,
          analysis.confidence || 70
        );
      }

      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      console.error('Error analyzing user text:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze user text',
        error: error.message
      });
    }
  }

  /**
   * Analyze behavioral patterns
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async analyzeBehavioralPatterns(req, res) {
    try {
      const { userId, userActivity, interactions, userChoices } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: userId'
        });
      }

      // Analyze different behavioral aspects
      const timePatterns = aiService.analyzeTimePatterns(userActivity);
      const microInteractions = aiService.analyzeMicroInteractions(interactions);
      const decisionPatterns = aiService.analyzeDecisionPatterns(userChoices);
      
      // Combine results
      const behavioralAnalysis = {
        timePatterns,
        microInteractions,
        decisionPatterns
      };
      
      // Store behavioral patterns
      await aiService.storeUserProfile(userId, {
        behavioralPatterns: behavioralAnalysis
      });

      res.json({
        success: true,
        behavioralAnalysis
      });
    } catch (error) {
      console.error('Error analyzing behavioral patterns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to analyze behavioral patterns',
        error: error.message
      });
    }
  }

  /**
   * Classify user into travel archetype
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async classifyTravelArchetype(req, res) {
    try {
      const { userId, personalityProfile, behaviorData } = req.body;

      if (!userId || !personalityProfile) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: userId and personalityProfile'
        });
      }

      const archetypeData = aiService.classifyTravelArchetype(personalityProfile, behaviorData);
      
      // Store insight
      await aiService.storeInsight(
        userId,
        'travel_archetype',
        archetypeData,
        80
      );

      res.json({
        success: true,
        archetypeData
      });
    } catch (error) {
      console.error('Error classifying travel archetype:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to classify travel archetype',
        error: error.message
      });
    }
  }

  /**
   * Predict travel intent
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async predictTravelIntent(req, res) {
    try {
      const { userId, userBehavior, externalFactors } = req.body;

      if (!userId || !userBehavior) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: userId and userBehavior'
        });
      }

      const prediction = await aiService.predictTravelIntent(userBehavior, externalFactors || {});
      
      // Store insight
      if (prediction && !prediction.error) {
        await aiService.storeInsight(
          userId,
          'travel_intent',
          prediction,
          prediction.confidence
        );
      }

      res.json({
        success: true,
        prediction
      });
    } catch (error) {
      console.error('Error predicting travel intent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to predict travel intent',
        error: error.message
      });
    }
  }

  /**
   * Get contextual factors for recommendations
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getContextualFactors(req, res) {
    try {
      const { context } = req.body;

      if (!context) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: context'
        });
      }

      const contextualFactors = await aiService.getContextualFactors(context);

      res.json({
        success: true,
        contextualFactors
      });
    } catch (error) {
      console.error('Error getting contextual factors:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contextual factors',
        error: error.message
      });
    }
  }
}

module.exports = new AIController();
