const supabase = require('../config/supabase');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

/**
 * AI Service for enhanced travel recommendations and user profiling
 */
class AIService {
  constructor() {
    this.openaiApiKey = null;
    this.initialized = false;
    this.initPromise = this.initialize();
  }

  /**
   * Initialize the AI service and load API keys
   */
  async initialize() {
    try {
      // Fetch the OpenAI API key from the database
      const { data, error } = await supabase
        .from('api_integration_keys_ai2324fk')
        .select('api_key')
        .eq('service_name', 'openai')
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching OpenAI API key:', error);
        throw new Error('Failed to initialize AI service: API key not found');
      }

      this.openaiApiKey = data.api_key;
      this.initialized = true;
      console.log('AI Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('AI Service initialization error:', error);
      throw error;
    }
  }

  /**
   * Ensure the service is initialized before making any API calls
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initPromise;
    }
  }

  /**
   * Make a request to OpenAI API
   * @param {Object} requestData - The request data to send to OpenAI
   * @returns {Promise<Object>} - The response from OpenAI
   */
  async callOpenAI(requestData) {
    await this.ensureInitialized();

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('OpenAI API error:', error.response?.data || error.message);
      throw new Error('Failed to get response from OpenAI');
    }
  }

  /**
   * Multi-Modal AI Analysis - Analyze user photos to determine preferences
   * @param {Array} userImages - Array of image URLs to analyze
   * @returns {Object} - Extracted preferences
   */
  async analyzeUserPhotos(userImages) {
    if (!userImages || userImages.length === 0) {
      return { preferences: [] };
    }

    try {
      const messages = [
        {
          role: "system",
          content: "You are a travel preference analyzer. Analyze these travel photos to determine user preferences including destination types, accommodation styles, activities they enjoy, and overall travel personality."
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze these travel photos to determine user preferences:" },
            ...userImages.slice(0, 5).map(img => ({ type: "image_url", image_url: { url: img } }))
          ]
        }
      ];

      const response = await this.callOpenAI({
        model: "gpt-4-vision-preview",
        messages,
        max_tokens: 500
      });

      // Extract structured preferences from the response
      const analysisText = response.choices[0].message.content;
      
      // Parse the text response into structured data
      const preferences = this.extractPreferencesFromText(analysisText);
      
      return preferences;
    } catch (error) {
      console.error('Error analyzing user photos:', error);
      return { preferences: [], error: error.message };
    }
  }

  /**
   * Extract structured preferences from AI-generated text
   * @param {String} text - The text to parse
   * @returns {Object} - Structured preference data
   */
  extractPreferencesFromText(text) {
    // This is a simplified implementation
    // In a production system, you would use more robust parsing or ask the AI to return JSON directly
    
    const preferences = {
      destinationTypes: [],
      accommodationStyles: [],
      activities: [],
      travelPersonality: []
    };
    
    // Simple extraction based on keywords
    if (text.match(/beach|ocean|sea|coast|water/i)) {
      preferences.destinationTypes.push('Beach');
    }
    
    if (text.match(/mountain|hiking|alpine|hill|trek/i)) {
      preferences.destinationTypes.push('Mountains');
    }
    
    if (text.match(/city|urban|metropolitan|skyline/i)) {
      preferences.destinationTypes.push('Urban');
    }
    
    if (text.match(/luxury|high-end|premium|exclusive|elegant/i)) {
      preferences.accommodationStyles.push('Luxury');
    }
    
    if (text.match(/adventure|extreme|outdoor|thrill/i)) {
      preferences.activities.push('Adventure');
      preferences.travelPersonality.push('Adventurous');
    }
    
    if (text.match(/relax|peaceful|calm|serene|tranquil/i)) {
      preferences.activities.push('Relaxation');
      preferences.travelPersonality.push('Relaxed');
    }

    return preferences;
  }

  /**
   * Natural Language Processing for Reviews/Notes
   * @param {String} userNotes - User's notes about travel
   * @param {Array} reviews - User's reviews of properties
   * @returns {Object} - Extracted preferences and sentiment analysis
   */
  async analyzeUserText(userNotes, reviews) {
    try {
      const combinedText = `User notes: ${userNotes || 'None provided'}\n\nUser reviews: ${reviews ? reviews.join('\n') : 'None provided'}`;
      
      const response = await this.callOpenAI({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Analyze travel preferences from user notes and reviews. Extract personality traits, preferred activities, accommodation preferences, and destination preferences. Return the analysis in JSON format."
          },
          {
            role: "user",
            content: combinedText
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      console.error('Error analyzing user text:', error);
      return { 
        error: error.message,
        personalityTraits: [],
        preferredActivities: [],
        accommodationPreferences: [],
        destinationPreferences: []
      };
    }
  }

  /**
   * Behavioral Pattern Recognition - Analyze user behavior patterns
   * @param {Object} userActivity - User activity data
   * @returns {Object} - Recognized patterns
   */
  analyzeTimePatterns(userActivity) {
    if (!userActivity) {
      return {
        bookingTime: null,
        browsingTime: null,
        seasonalPreference: null,
        planningHorizon: null
      };
    }

    const patterns = {
      bookingTime: this.detectBookingPatterns(userActivity.bookings || []),
      browsingTime: this.analyzeBrowsingHours(userActivity.sessions || []),
      seasonalPreference: this.detectSeasonalTrends(userActivity.searches || []),
      planningHorizon: this.calculatePlanningWindow(userActivity.bookings || [])
    };

    return patterns;
  }

  /**
   * Detect patterns in booking times
   * @param {Array} bookings - User's booking history
   * @returns {Object} - Booking time patterns
   */
  detectBookingPatterns(bookings) {
    if (!bookings || bookings.length === 0) {
      return { preferredDayOfWeek: null, preferredTimeOfDay: null };
    }

    // Count occurrences of each day of week and time of day
    const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    const timeOfDayCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    bookings.forEach(booking => {
      const bookingDate = new Date(booking.bookingDate);
      
      // Day of week
      const dayOfWeek = bookingDate.getDay();
      dayOfWeekCounts[dayOfWeek]++;
      
      // Time of day
      const hour = bookingDate.getHours();
      if (hour >= 5 && hour < 12) timeOfDayCounts.morning++;
      else if (hour >= 12 && hour < 17) timeOfDayCounts.afternoon++;
      else if (hour >= 17 && hour < 22) timeOfDayCounts.evening++;
      else timeOfDayCounts.night++;
    });

    // Find most common day of week
    const maxDayCount = Math.max(...dayOfWeekCounts);
    const preferredDayIndex = dayOfWeekCounts.indexOf(maxDayCount);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const preferredDayOfWeek = days[preferredDayIndex];

    // Find most common time of day
    const timeEntries = Object.entries(timeOfDayCounts);
    const preferredTimeOfDay = timeEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return { 
      preferredDayOfWeek,
      preferredTimeOfDay,
      dayDistribution: dayOfWeekCounts.map((count, index) => ({ 
        day: days[index], 
        count,
        percentage: (count / bookings.length * 100).toFixed(1)
      })),
      timeDistribution: Object.entries(timeOfDayCounts).map(([time, count]) => ({
        timeOfDay: time,
        count,
        percentage: (count / bookings.length * 100).toFixed(1)
      }))
    };
  }

  /**
   * Analyze browsing hours to detect patterns
   * @param {Array} sessions - User's browsing sessions
   * @returns {Object} - Browsing time patterns
   */
  analyzeBrowsingHours(sessions) {
    if (!sessions || sessions.length === 0) {
      return { preferredBrowsingTime: null, averageSessionDuration: null };
    }

    // Count sessions by hour of day
    const hourCounts = Array(24).fill(0);
    let totalDuration = 0;

    sessions.forEach(session => {
      const sessionStart = new Date(session.startTime);
      const hour = sessionStart.getHours();
      hourCounts[hour]++;
      
      // Calculate session duration if available
      if (session.endTime) {
        const duration = (new Date(session.endTime) - sessionStart) / (1000 * 60); // in minutes
        totalDuration += duration;
      }
    });

    // Find most common browsing hour
    const maxHourCount = Math.max(...hourCounts);
    const preferredHourIndex = hourCounts.indexOf(maxHourCount);
    const preferredBrowsingTime = `${preferredHourIndex}:00 - ${preferredHourIndex + 1}:00`;

    // Calculate average session duration
    const averageSessionDuration = sessions.length > 0 ? (totalDuration / sessions.length).toFixed(1) : null;

    return { 
      preferredBrowsingTime,
      averageSessionDuration: averageSessionDuration ? `${averageSessionDuration} minutes` : null,
      hourlyDistribution: hourCounts.map((count, hour) => ({
        hour: `${hour}:00`,
        count,
        percentage: (count / sessions.length * 100).toFixed(1)
      }))
    };
  }

  /**
   * Detect seasonal trends in user searches
   * @param {Array} searches - User's search history
   * @returns {Object} - Seasonal preference data
   */
  detectSeasonalTrends(searches) {
    if (!searches || searches.length === 0) {
      return { preferredSeason: null, seasonalDistribution: {} };
    }

    // Count searches by season
    const seasonCounts = {
      spring: 0,
      summer: 0,
      fall: 0,
      winter: 0
    };

    searches.forEach(search => {
      const searchDate = new Date(search.date);
      const month = searchDate.getMonth();
      
      // Determine season based on month
      if (month >= 2 && month <= 4) seasonCounts.spring++;
      else if (month >= 5 && month <= 7) seasonCounts.summer++;
      else if (month >= 8 && month <= 10) seasonCounts.fall++;
      else seasonCounts.winter++;
    });

    // Find preferred season
    const preferredSeason = Object.entries(seasonCounts)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    // Calculate percentages
    const seasonalDistribution = {};
    Object.entries(seasonCounts).forEach(([season, count]) => {
      seasonalDistribution[season] = {
        count,
        percentage: (count / searches.length * 100).toFixed(1)
      };
    });

    return { 
      preferredSeason,
      seasonalDistribution
    };
  }

  /**
   * Calculate planning window (how far in advance user plans trips)
   * @param {Array} bookings - User's booking history
   * @returns {Object} - Planning window data
   */
  calculatePlanningWindow(bookings) {
    if (!bookings || bookings.length === 0) {
      return { averagePlanningDays: null, planningStyle: null };
    }

    // Calculate planning window for each booking
    const planningWindows = [];
    
    bookings.forEach(booking => {
      const bookingDate = new Date(booking.bookingDate);
      const checkInDate = new Date(booking.checkIn);
      
      // Calculate days between booking and check-in
      const planningDays = Math.round((checkInDate - bookingDate) / (1000 * 60 * 60 * 24));
      planningWindows.push(planningDays);
    });

    // Calculate average planning window
    const totalDays = planningWindows.reduce((sum, days) => sum + days, 0);
    const averagePlanningDays = Math.round(totalDays / planningWindows.length);

    // Determine planning style
    let planningStyle;
    if (averagePlanningDays < 14) {
      planningStyle = 'Spontaneous';
    } else if (averagePlanningDays < 60) {
      planningStyle = 'Moderate Planner';
    } else {
      planningStyle = 'Advance Planner';
    }

    return { 
      averagePlanningDays,
      planningStyle,
      shortestPlanningDays: Math.min(...planningWindows),
      longestPlanningDays: Math.max(...planningWindows)
    };
  }

  /**
   * Analyze micro-interactions to understand user behavior
   * @param {Object} interactions - User micro-interaction data
   * @returns {Object} - Analysis of micro-interactions
   */
  analyzeMicroInteractions(interactions) {
    if (!interactions) {
      return {
        hoverTime: null,
        scrollBehavior: null,
        imageEngagement: null,
        priceElasticity: null
      };
    }

    return {
      hoverTime: this.calculateAverageHoverTime(interactions.hovers || []),
      scrollBehavior: this.analyzeScrollPatterns(interactions.scrolls || []),
      imageEngagement: this.calculateImageViewTime(interactions.imageViews || []),
      priceElasticity: this.analyzePriceSensitivity(interactions.priceFilters || [])
    };
  }

  /**
   * Calculate average hover time on elements
   * @param {Array} hovers - Hover interaction data
   * @returns {Object} - Hover time analysis
   */
  calculateAverageHoverTime(hovers) {
    if (!hovers || hovers.length === 0) {
      return { averageTime: null, mostViewedElementType: null };
    }

    // Calculate total hover time and count by element type
    const hoverTimeByType = {};
    const hoverCountByType = {};
    let totalHoverTime = 0;

    hovers.forEach(hover => {
      const duration = hover.duration || 0;
      const elementType = hover.elementType || 'unknown';
      
      hoverTimeByType[elementType] = (hoverTimeByType[elementType] || 0) + duration;
      hoverCountByType[elementType] = (hoverCountByType[elementType] || 0) + 1;
      totalHoverTime += duration;
    });

    // Find most viewed element type
    const mostViewedElementType = Object.entries(hoverTimeByType)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];

    // Calculate average hover time
    const averageTime = (totalHoverTime / hovers.length).toFixed(1);

    return { 
      averageTime: `${averageTime} seconds`,
      mostViewedElementType,
      elementBreakdown: Object.entries(hoverTimeByType).map(([type, time]) => ({
        elementType: type,
        totalTime: time,
        percentage: (time / totalHoverTime * 100).toFixed(1)
      }))
    };
  }

  /**
   * Analyze scroll patterns to understand user engagement
   * @param {Array} scrolls - Scroll interaction data
   * @returns {Object} - Scroll behavior analysis
   */
  analyzeScrollPatterns(scrolls) {
    if (!scrolls || scrolls.length === 0) {
      return { scrollDepth: null, scrollSpeed: null };
    }

    // Calculate average scroll depth and speed
    let totalDepth = 0;
    let totalSpeed = 0;
    let completedScrolls = 0;

    scrolls.forEach(scroll => {
      if (scroll.depthPercentage) {
        totalDepth += scroll.depthPercentage;
        completedScrolls++;
      }
      
      if (scroll.pixelsPerSecond) {
        totalSpeed += scroll.pixelsPerSecond;
      }
    });

    const averageDepth = completedScrolls > 0 ? (totalDepth / completedScrolls).toFixed(1) : null;
    const averageSpeed = scrolls.length > 0 ? (totalSpeed / scrolls.length).toFixed(1) : null;

    // Determine scroll behavior
    let scrollBehavior;
    if (averageDepth > 80) {
      scrollBehavior = averageSpeed > 1000 ? 'Rapid Deep Reader' : 'Thorough Reader';
    } else {
      scrollBehavior = averageSpeed > 1000 ? 'Quick Scanner' : 'Casual Browser';
    }

    return { 
      scrollDepth: averageDepth ? `${averageDepth}%` : null,
      scrollSpeed: averageSpeed ? `${averageSpeed} px/s` : null,
      scrollBehavior
    };
  }

  /**
   * Calculate image view time to understand visual engagement
   * @param {Array} imageViews - Image view interaction data
   * @returns {Object} - Image engagement analysis
   */
  calculateImageViewTime(imageViews) {
    if (!imageViews || imageViews.length === 0) {
      return { averageViewTime: null, totalImagesViewed: 0 };
    }

    // Calculate total view time and count
    let totalViewTime = 0;
    const uniqueImageIds = new Set();

    imageViews.forEach(view => {
      totalViewTime += view.duration || 0;
      if (view.imageId) uniqueImageIds.add(view.imageId);
    });

    // Calculate average view time
    const averageViewTime = (totalViewTime / imageViews.length).toFixed(1);

    return { 
      averageViewTime: `${averageViewTime} seconds`,
      totalImagesViewed: uniqueImageIds.size,
      visualEngagementLevel: averageViewTime > 5 ? 'High' : (averageViewTime > 2 ? 'Medium' : 'Low')
    };
  }

  /**
   * Analyze price sensitivity based on filters and searches
   * @param {Array} priceFilters - Price filter interaction data
   * @returns {Object} - Price sensitivity analysis
   */
  analyzePriceSensitivity(priceFilters) {
    if (!priceFilters || priceFilters.length === 0) {
      return { priceElasticity: null, averagePriceRange: null };
    }

    // Calculate average min and max price
    let totalMinPrice = 0;
    let totalMaxPrice = 0;
    let priceChanges = 0;

    for (let i = 0; i < priceFilters.length; i++) {
      totalMinPrice += priceFilters[i].minPrice || 0;
      totalMaxPrice += priceFilters[i].maxPrice || 0;
      
      // Count price changes
      if (i > 0) {
        const prevFilter = priceFilters[i-1];
        const currentFilter = priceFilters[i];
        
        if (prevFilter.minPrice !== currentFilter.minPrice || 
            prevFilter.maxPrice !== currentFilter.maxPrice) {
          priceChanges++;
        }
      }
    }

    const averageMinPrice = (totalMinPrice / priceFilters.length).toFixed(0);
    const averageMaxPrice = (totalMaxPrice / priceFilters.length).toFixed(0);
    
    // Calculate price elasticity (changes / opportunities)
    const priceElasticity = ((priceChanges / (priceFilters.length - 1)) * 100).toFixed(1);

    // Determine price sensitivity level
    let priceSensitivity;
    if (priceElasticity > 60) {
      priceSensitivity = 'High';
    } else if (priceElasticity > 30) {
      priceSensitivity = 'Medium';
    } else {
      priceSensitivity = 'Low';
    }

    return { 
      priceElasticity: `${priceElasticity}%`,
      priceSensitivity,
      averagePriceRange: `$${averageMinPrice} - $${averageMaxPrice}`
    };
  }

  /**
   * Analyze decision-making patterns
   * @param {Object} userChoices - User choice data
   * @returns {Object} - Decision pattern analysis
   */
  analyzeDecisionPatterns(userChoices) {
    if (!userChoices) {
      return {
        impulsiveVsPlanned: null,
        priceVsQuality: null,
        uniquenessPreference: null,
        riskTolerance: null
      };
    }

    return {
      impulsiveVsPlanned: this.calculateImpulsivityScore(userChoices),
      priceVsQuality: this.analyzePriceQualityTradeoff(userChoices),
      uniquenessPreference: this.calculateUniquenessSeeking(userChoices),
      riskTolerance: this.assessRiskTolerance(userChoices)
    };
  }

  /**
   * Calculate impulsivity score based on user choices
   * @param {Object} userChoices - User choice data
   * @returns {Object} - Impulsivity analysis
   */
  calculateImpulsivityScore(userChoices) {
    const bookings = userChoices.bookings || [];
    const searches = userChoices.searches || [];
    
    if (bookings.length === 0) {
      return { score: null, category: null };
    }

    // Calculate time between search and booking
    let totalDecisionTime = 0;
    let quickDecisions = 0;

    bookings.forEach(booking => {
      // Find related searches (same property or similar dates)
      const relatedSearches = searches.filter(search => 
        search.propertyId === booking.propertyId || 
        Math.abs(new Date(search.date) - new Date(booking.bookingDate)) < 24*60*60*1000
      );
      
      if (relatedSearches.length > 0) {
        // Find earliest related search
        const earliestSearch = relatedSearches.reduce((earliest, search) => 
          new Date(search.date) < new Date(earliest.date) ? search : earliest, relatedSearches[0]);
          
        // Calculate decision time in hours
        const decisionTime = (new Date(booking.bookingDate) - new Date(earliestSearch.date)) / (1000 * 60 * 60);
        totalDecisionTime += decisionTime;
        
        // Count quick decisions (less than 1 hour)
        if (decisionTime < 1) {
          quickDecisions++;
        }
      }
    });
    
    const averageDecisionTime = totalDecisionTime / bookings.length;
    const quickDecisionRate = (quickDecisions / bookings.length) * 100;
    
    // Calculate impulsivity score (0-100)
    const impulsivityScore = Math.min(100, Math.max(0, 
      (100 - (averageDecisionTime / 24) * 20) + (quickDecisionRate / 2)
    )).toFixed(0);
    
    // Determine impulsivity category
    let impulsivityCategory;
    if (impulsivityScore > 70) {
      impulsivityCategory = 'Highly Impulsive';
    } else if (impulsivityScore > 40) {
      impulsivityCategory = 'Moderately Impulsive';
    } else {
      impulsivityCategory = 'Planned Decision Maker';
    }
    
    return { 
      score: impulsivityScore,
      category: impulsivityCategory,
      averageDecisionTimeHours: averageDecisionTime.toFixed(1),
      quickDecisionPercentage: quickDecisionRate.toFixed(1)
    };
  }

  /**
   * Analyze price vs quality tradeoff in user choices
   * @param {Object} userChoices - User choice data
   * @returns {Object} - Price vs quality analysis
   */
  analyzePriceQualityTradeoff(userChoices) {
    const viewedProperties = userChoices.viewedProperties || [];
    const bookings = userChoices.bookings || [];
    
    if (bookings.length === 0 || viewedProperties.length === 0) {
      return { preference: null, score: null };
    }

    // Compare booked properties with viewed properties
    let qualityOverPrice = 0;
    let priceOverQuality = 0;
    
    bookings.forEach(booking => {
      // Find viewed properties around the same time
      const contemporaryViews = viewedProperties.filter(view => 
        Math.abs(new Date(view.viewDate) - new Date(booking.bookingDate)) < 7*24*60*60*1000
      );
      
      if (contemporaryViews.length > 0) {
        // Calculate average price and rating of viewed properties
        const avgPrice = contemporaryViews.reduce((sum, view) => sum + view.price, 0) / contemporaryViews.length;
        const avgRating = contemporaryViews.reduce((sum, view) => sum + view.rating, 0) / contemporaryViews.length;
        
        // Compare booked property with averages
        if (booking.price > avgPrice && booking.rating > avgRating) {
          qualityOverPrice++;
        } else if (booking.price < avgPrice && booking.rating < avgRating) {
          priceOverQuality++;
        }
      }
    });
    
    // Calculate price-quality preference score (-100 to 100)
    // Negative: price-focused, Positive: quality-focused
    const totalComparisons = qualityOverPrice + priceOverQuality;
    let pqScore = 0;
    
    if (totalComparisons > 0) {
      pqScore = ((qualityOverPrice - priceOverQuality) / totalComparisons) * 100;
    }
    
    // Determine preference category
    let preference;
    if (pqScore > 50) {
      preference = 'Strongly Quality-Focused';
    } else if (pqScore > 20) {
      preference = 'Quality-Focused';
    } else if (pqScore < -50) {
      preference = 'Strongly Price-Focused';
    } else if (pqScore < -20) {
      preference = 'Price-Focused';
    } else {
      preference = 'Balanced Price-Quality';
    }
    
    return { 
      preference,
      score: pqScore.toFixed(0),
      qualityChoices: qualityOverPrice,
      priceChoices: priceOverQuality
    };
  }

  /**
   * Calculate uniqueness seeking score based on user choices
   * @param {Object} userChoices - User choice data
   * @returns {Object} - Uniqueness preference analysis
   */
  calculateUniquenessSeeking(userChoices) {
    const bookings = userChoices.bookings || [];
    const searches = userChoices.searches || [];
    
    if (bookings.length === 0) {
      return { score: null, category: null };
    }

    // Count unique property types and unusual locations
    const propertyTypes = new Set();
    const destinations = new Set();
    let unusualPropertyCount = 0;
    
    // Define common vs unusual property types
    const commonPropertyTypes = ['hotel', 'apartment', 'resort', 'villa'];
    const unusualPropertyTypes = ['treehouse', 'castle', 'cave', 'igloo', 'lighthouse', 'container', 'boat', 'dome'];
    
    bookings.forEach(booking => {
      // Track unique property types and destinations
      if (booking.propertyType) {
        propertyTypes.add(booking.propertyType.toLowerCase());
        
        // Count unusual property types
        if (unusualPropertyTypes.some(type => booking.propertyType.toLowerCase().includes(type))) {
          unusualPropertyCount++;
        }
      }
      
      if (booking.destination) {
        destinations.add(booking.destination);
      }
    });
    
    // Calculate search diversity
    const searchTerms = new Set();
    searches.forEach(search => {
      if (search.searchTerm) {
        searchTerms.add(search.searchTerm.toLowerCase());
      }
    });
    
    // Calculate uniqueness score (0-100)
    const typeUniqueness = Math.min(100, (propertyTypes.size / bookings.length) * 100);
    const unusualRatio = (unusualPropertyCount / bookings.length) * 100;
    const destinationDiversity = Math.min(100, (destinations.size / bookings.length) * 100);
    const searchDiversity = Math.min(100, (searchTerms.size / searches.length) * 100);
    
    const uniquenessScore = (
      typeUniqueness * 0.3 + 
      unusualRatio * 0.4 + 
      destinationDiversity * 0.2 + 
      searchDiversity * 0.1
    ).toFixed(0);
    
    // Determine uniqueness category
    let uniquenessCategory;
    if (uniquenessScore > 70) {
      uniquenessCategory = 'Novelty Seeker';
    } else if (uniquenessScore > 40) {
      uniquenessCategory = 'Moderate Explorer';
    } else {
      uniquenessCategory = 'Comfort Seeker';
    }
    
    return { 
      score: uniquenessScore,
      category: uniquenessCategory,
      unusualPropertyPercentage: unusualRatio.toFixed(1),
      propertyTypeDiversity: propertyTypes.size
    };
  }

  /**
   * Assess risk tolerance based on user choices
   * @param {Object} userChoices - User choice data
   * @returns {Object} - Risk tolerance analysis
   */
  assessRiskTolerance(userChoices) {
    const bookings = userChoices.bookings || [];
    
    if (bookings.length === 0) {
      return { score: null, category: null };
    }

    // Factors indicating higher risk tolerance
    let newDestinationCount = 0;
    let lowRatingCount = 0;
    let lastMinuteCount = 0;
    let longStayCount = 0;
    
    // Define thresholds
    const lowRatingThreshold = 4.0;
    const lastMinuteThreshold = 7; // days
    const longStayThreshold = 14; // days
    
    // Track previously visited destinations
    const visitedDestinations = new Set();
    
    bookings.forEach((booking, index) => {
      // Check if destination is new
      if (booking.destination && !visitedDestinations.has(booking.destination)) {
        newDestinationCount++;
        visitedDestinations.add(booking.destination);
      }
      
      // Check if property has low rating
      if (booking.rating && booking.rating < lowRatingThreshold) {
        lowRatingCount++;
      }
      
      // Check if booking was last-minute
      const daysBefore = booking.checkIn && booking.bookingDate ? 
        Math.round((new Date(booking.checkIn) - new Date(booking.bookingDate)) / (1000 * 60 * 60 * 24)) : null;
      
      if (daysBefore !== null && daysBefore <= lastMinuteThreshold) {
        lastMinuteCount++;
      }
      
      // Check if stay is long
      const stayLength = booking.checkIn && booking.checkOut ?
        Math.round((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24)) : null;
      
      if (stayLength !== null && stayLength >= longStayThreshold) {
        longStayCount++;
      }
    });
    
    // Calculate risk tolerance score (0-100)
    const newDestinationRate = (newDestinationCount / bookings.length) * 100;
    const lowRatingRate = (lowRatingCount / bookings.length) * 100;
    const lastMinuteRate = (lastMinuteCount / bookings.length) * 100;
    const longStayRate = (longStayCount / bookings.length) * 100;
    
    const riskToleranceScore = (
      newDestinationRate * 0.4 + 
      lowRatingRate * 0.3 + 
      lastMinuteRate * 0.2 + 
      longStayRate * 0.1
    ).toFixed(0);
    
    // Determine risk tolerance category
    let riskToleranceCategory;
    if (riskToleranceScore > 70) {
      riskToleranceCategory = 'High Risk Tolerance';
    } else if (riskToleranceScore > 40) {
      riskToleranceCategory = 'Moderate Risk Tolerance';
    } else {
      riskToleranceCategory = 'Low Risk Tolerance';
    }
    
    return { 
      score: riskToleranceScore,
      category: riskToleranceCategory,
      newDestinationPercentage: newDestinationRate.toFixed(1),
      lowRatingBookingPercentage: lowRatingRate.toFixed(1),
      lastMinuteBookingPercentage: lastMinuteRate.toFixed(1)
    };
  }

  /**
   * Generate AI-powered personality profile based on user data
   * @param {Object} userData - Comprehensive user data
   * @returns {Object} - Personality profile
   */
  async generatePersonalityProfile(userData) {
    try {
      // Prepare a comprehensive data object for analysis
      const analysisData = {
        demographics: userData.demographics || {},
        searchHistory: userData.searchHistory || [],
        bookingHistory: userData.bookingHistory || [],
        viewingPatterns: userData.viewingPatterns || {},
        favoriteProperties: userData.favoriteProperties || [],
        reviews: userData.reviews || [],
        timePatterns: this.analyzeTimePatterns(userData.activity),
        microInteractions: this.analyzeMicroInteractions(userData.interactions),
        decisionPatterns: this.analyzeDecisionPatterns(userData.choices)
      };
      
      // Call OpenAI to generate personality profile
      const response = await this.callOpenAI({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `
              Analyze user data to create a Big Five personality profile for travel recommendations:
              - Openness: preference for unique/conventional experiences
              - Conscientiousness: planning vs spontaneous behavior
              - Extraversion: social vs solitary travel preferences
              - Agreeableness: group vs individual accommodation needs
              - Neuroticism: comfort zone vs adventure seeking

              Also classify the user into a travel archetype based on the data.
              Return your analysis in JSON format with these fields:
              - openness (0-100 score)
              - conscientiousness (0-100 score)
              - extraversion (0-100 score)
              - agreeableness (0-100 score)
              - neuroticism (0-100 score)
              - travelArchetype (string)
              - archetypeDescription (string)
              - keyInsights (array of strings)
            `
          },
          {
            role: "user",
            content: JSON.stringify(analysisData)
          }
        ],
        response_format: { type: "json_object" }
      });

      // Parse and return the personality profile
      const profile = JSON.parse(response.choices[0].message.content);
      return profile;
    } catch (error) {
      console.error('Error generating personality profile:', error);
      return {
        error: error.message,
        openness: 50,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50,
        travelArchetype: 'Unknown',
        archetypeDescription: 'Unable to determine travel archetype',
        keyInsights: ['Error generating personality profile']
      };
    }
  }

  /**
   * Classify user into a travel archetype
   * @param {Object} personalityProfile - User personality profile
   * @param {Object} behaviorData - User behavior data
   * @returns {Object} - Travel archetype classification
   */
  classifyTravelArchetype(personalityProfile, behaviorData) {
    // Define travel archetypes with personality traits
    const archetypes = {
      'The Explorer': { 
        openness: 'high', 
        neuroticism: 'low',
        description: 'Seeks new experiences and destinations, values authenticity and adventure',
        recommendedProperties: ['Treehouse', 'Remote Cabin', 'Eco Lodge', 'Wilderness Retreat']
      },
      'The Comfort Seeker': { 
        neuroticism: 'high', 
        conscientiousness: 'high',
        description: 'Prioritizes comfort, security and predictability in travel experiences',
        recommendedProperties: ['Luxury Resort', 'Villa', 'High-end Hotel', 'Serviced Apartment']
      },
      'The Social Butterfly': { 
        extraversion: 'high', 
        agreeableness: 'high',
        description: 'Travels to meet people and make connections, enjoys shared experiences',
        recommendedProperties: ['Hostel', 'Co-living Space', 'Resort', 'Urban Apartment']
      },
      'The Digital Nomad': { 
        openness: 'high', 
        conscientiousness: 'moderate',
        description: 'Seeks balance between work and exploration, values good connectivity',
        recommendedProperties: ['Co-working Hotel', 'Long-term Rental', 'Connected Cabin', 'Urban Loft']
      },
      'The Luxury Traveler': { 
        conscientiousness: 'high', 
        openness: 'moderate',
        description: 'Values premium experiences, service excellence and exclusivity',
        recommendedProperties: ['5-star Resort', 'Private Villa', 'Boutique Hotel', 'Luxury Yacht']
      },
      'The Budget Backpacker': { 
        openness: 'high', 
        conscientiousness: 'low',
        description: 'Prioritizes value and authentic experiences over luxury',
        recommendedProperties: ['Hostel', 'Budget Hotel', 'Shared Apartment', 'Camping']
      },
      'The Cultural Enthusiast': { 
        openness: 'high', 
        extraversion: 'moderate',
        description: 'Travels to experience different cultures, history, and local traditions',
        recommendedProperties: ['Historic Stay', 'City Apartment', 'Local Homestay', 'Heritage Hotel']
      },
      'The Wellness Seeker': { 
        conscientiousness: 'high', 
        neuroticism: 'moderate',
        description: 'Prioritizes health, wellness and rejuvenation during travel',
        recommendedProperties: ['Spa Resort', 'Yoga Retreat', 'Hot Springs Villa', 'Wellness Center']
      }
    };

    // Convert personality scores to categories
    const personalityCategories = {
      openness: personalityProfile.openness > 70 ? 'high' : (personalityProfile.openness > 40 ? 'moderate' : 'low'),
      conscientiousness: personalityProfile.conscientiousness > 70 ? 'high' : (personalityProfile.conscientiousness > 40 ? 'moderate' : 'low'),
      extraversion: personalityProfile.extraversion > 70 ? 'high' : (personalityProfile.extraversion > 40 ? 'moderate' : 'low'),
      agreeableness: personalityProfile.agreeableness > 70 ? 'high' : (personalityProfile.agreeableness > 40 ? 'moderate' : 'low'),
      neuroticism: personalityProfile.neuroticism > 70 ? 'high' : (personalityProfile.neuroticism > 40 ? 'moderate' : 'low')
    };

    // Calculate match score for each archetype
    const archetypeScores = {};
    
    Object.entries(archetypes).forEach(([archetypeName, archetypeTraits]) => {
      let matchScore = 0;
      let matchFactors = [];
      
      // Check personality trait matches
      Object.entries(archetypeTraits).forEach(([trait, level]) => {
        if (trait !== 'description' && trait !== 'recommendedProperties') {
          if (personalityCategories[trait] === level) {
            matchScore += 25;
            matchFactors.push(`${trait} (${level})`);
          } else if (
            (personalityCategories[trait] === 'moderate' && level === 'high') ||
            (personalityCategories[trait] === 'high' && level === 'moderate')
          ) {
            matchScore += 15;
            matchFactors.push(`${trait} (partial match)`);
          }
        }
      });
      
      // Check behavior matches if available
      if (behaviorData) {
        if (archetypeName === 'The Explorer' && behaviorData.uniquenessPreference?.category === 'Novelty Seeker') {
          matchScore += 20;
          matchFactors.push('novelty seeking behavior');
        }
        
        if (archetypeName === 'The Comfort Seeker' && behaviorData.riskTolerance?.category === 'Low Risk Tolerance') {
          matchScore += 20;
          matchFactors.push('low risk tolerance');
        }
        
        if (archetypeName === 'The Luxury Traveler' && behaviorData.priceVsQuality?.preference === 'Strongly Quality-Focused') {
          matchScore += 20;
          matchFactors.push('quality-focused decisions');
        }
        
        if (archetypeName === 'The Budget Backpacker' && behaviorData.priceVsQuality?.preference === 'Strongly Price-Focused') {
          matchScore += 20;
          matchFactors.push('price-focused decisions');
        }
      }
      
      archetypeScores[archetypeName] = {
        score: matchScore,
        factors: matchFactors,
        description: archetypeTraits.description,
        recommendedProperties: archetypeTraits.recommendedProperties
      };
    });
    
    // Find best matching archetype
    const bestMatch = Object.entries(archetypeScores)
      .reduce((best, [archetype, data]) => data.score > best.score ? { archetype, score: data.score } : best, { archetype: '', score: 0 });
    
    // Get top 3 archetypes
    const topArchetypes = Object.entries(archetypeScores)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 3)
      .map(([archetype, data]) => ({
        archetype,
        score: data.score,
        description: data.description,
        factors: data.factors,
        recommendedProperties: data.recommendedProperties
      }));
    
    return {
      primaryArchetype: bestMatch.archetype,
      matchScore: bestMatch.score,
      primaryDescription: archetypes[bestMatch.archetype]?.description,
      recommendedProperties: archetypes[bestMatch.archetype]?.recommendedProperties,
      topArchetypes
    };
  }

  /**
   * Generate contextual AI recommendations based on user profile and context
   * @param {Object} userProfile - User profile data
   * @param {Object} context - Contextual factors
   * @returns {Array} - Personalized recommendations
   */
  async generateRecommendations(userProfile, context) {
    try {
      // Get contextual factors
      const contextualFactors = await this.getContextualFactors(context);
      
      // Prepare the prompt for OpenAI
      const prompt = `
        Generate personalized travel recommendations considering:
        
        User Profile: ${JSON.stringify(userProfile)}
        
        Context: ${JSON.stringify(contextualFactors)}
        
        Provide 5 ranked recommendations with:
        1. Match percentage and reasoning
        2. Optimal timing suggestions
        3. Personalized experience recommendations
        4. Budget optimization tips
        5. Risk assessments
        
        Return the response as a JSON array of recommendation objects with these fields:
        - propertyId (string)
        - matchPercentage (number between 70-98)
        - matchReasons (array of strings)
        - optimalTiming (string)
        - experiences (array of strings)
        - budgetTips (array of strings)
        - riskAssessment (string)
      `;
      
      // Call OpenAI to generate recommendations
      const response = await this.callOpenAI({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a sophisticated travel recommendation system that creates personalized recommendations based on user profiles and contextual factors."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and process the recommendations
      const recommendations = JSON.parse(response.choices[0].message.content);
      
      // Enhance recommendations with additional data
      const enhancedRecommendations = await this.enhanceRecommendations(recommendations.recommendations);
      
      return enhancedRecommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return {
        error: error.message,
        recommendations: []
      };
    }
  }

  /**
   * Get contextual factors for recommendation generation
   * @param {Object} context - Basic context information
   * @returns {Object} - Enhanced contextual factors
   */
  async getContextualFactors(context) {
    try {
      // Get weather data if location is provided
      let weatherData = null;
      if (context.location) {
        weatherData = await this.getWeatherData(context.location);
      }
      
      // Get local events if location and dates are provided
      let eventsData = null;
      if (context.location && context.dates) {
        eventsData = await this.getLocalEvents(context.location, context.dates);
      }
      
      // Get trending destinations
      const trendingData = await this.getTrendingDestinations();
      
      // Get social media trends
      const socialTrends = await this.getSocialMediaTrends();
      
      // Get economic indicators if location is provided
      let economicData = null;
      if (context.location) {
        economicData = await this.getEconomicIndicators(context.location);
      }
      
      // Get seasonal factors if dates are provided
      let seasonalFactors = null;
      if (context.dates) {
        seasonalFactors = this.getSeasonalFactors(context.dates);
      }
      
      return {
        weather: weatherData,
        events: eventsData,
        trending: trendingData,
        social: socialTrends,
        economic: economicData,
        seasonal: seasonalFactors,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting contextual factors:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get weather data for a location
   * @param {String} location - Location to get weather for
   * @returns {Object} - Weather data
   */
  async getWeatherData(location) {
    // In a production system, this would call a weather API
    // For now, return mock data
    return {
      location,
      currentConditions: 'Sunny',
      temperature: 25,
      forecast: [
        { date: '2023-06-01', condition: 'Sunny', high: 28, low: 18 },
        { date: '2023-06-02', condition: 'Partly Cloudy', high: 26, low: 17 },
        { date: '2023-06-03', condition: 'Rainy', high: 22, low: 16 }
      ]
    };
  }

  /**
   * Get local events for a location and date range
   * @param {String} location - Location to get events for
   * @param {Object} dates - Date range
   * @returns {Array} - Events data
   */
  async getLocalEvents(location, dates) {
    // In a production system, this would call an events API
    // For now, return mock data
    return [
      {
        name: 'Summer Music Festival',
        date: '2023-06-15',
        category: 'Music',
        popularity: 'High'
      },
      {
        name: 'Local Food Market',
        date: '2023-06-10',
        category: 'Food',
        popularity: 'Medium'
      },
      {
        name: 'Art Exhibition',
        date: '2023-06-05',
        category: 'Art',
        popularity: 'Medium'
      }
    ];
  }

  /**
   * Get trending destinations
   * @returns {Array} - Trending destinations
   */
  async getTrendingDestinations() {
    // In a production system, this would call a trends API or analyze search data
    // For now, return mock data
    return [
      {
        name: 'Bali, Indonesia',
        trendingScore: 95,
        category: 'Beach'
      },
      {
        name: 'Santorini, Greece',
        trendingScore: 92,
        category: 'Island'
      },
      {
        name: 'Tokyo, Japan',
        trendingScore: 90,
        category: 'Urban'
      },
      {
        name: 'Costa Rica',
        trendingScore: 88,
        category: 'Nature'
      },
      {
        name: 'Marrakech, Morocco',
        trendingScore: 85,
        category: 'Cultural'
      }
    ];
  }

  /**
   * Get social media travel trends
   * @returns {Object} - Social media trends
   */
  async getSocialMediaTrends() {
    // In a production system, this would analyze social media data
    // For now, return mock data
    return {
      trendingHashtags: ['#vanlife', '#solotravel', '#digitalnomad', '#glamping', '#staycation'],
      trendingDestinations: ['Portugal', 'Mexico City', 'Croatia', 'South Korea', 'Iceland'],
      trendingExperiences: ['Wellness Retreats', 'Food Tours', 'Sustainable Travel', 'Remote Work Stays']
    };
  }

  /**
   * Get economic indicators for a location
   * @param {String} location - Location to get economic data for
   * @returns {Object} - Economic indicators
   */
  async getEconomicIndicators(location) {
    // In a production system, this would call an economic data API
    // For now, return mock data
    return {
      location,
      currencyStrength: 'Strong',
      exchangeRate: 1.2,
      costOfLivingIndex: 85,
      tourismOutlook: 'Growing'
    };
  }

  /**
   * Get seasonal factors for dates
   * @param {Object} dates - Date range
   * @returns {Object} - Seasonal factors
   */
  getSeasonalFactors(dates) {
    // Extract month from the start date
    const startDate = new Date(dates.start);
    const month = startDate.getMonth();
    
    // Determine season based on month (Northern Hemisphere)
    let season;
    if (month >= 2 && month <= 4) {
      season = 'Spring';
    } else if (month >= 5 && month <= 7) {
      season = 'Summer';
    } else if (month >= 8 && month <= 10) {
      season = 'Fall';
    } else {
      season = 'Winter';
    }
    
    // Define seasonal characteristics
    const seasonalFactors = {
      season,
      characteristics: [],
      travelConsiderations: []
    };
    
    // Set characteristics based on season
    switch (season) {
      case 'Spring':
        seasonalFactors.characteristics = ['Mild temperatures', 'Blooming flowers', 'Occasional rain'];
        seasonalFactors.travelConsiderations = ['Shoulder season prices', 'Less crowded attractions', 'Pack layers for changing weather'];
        break;
      case 'Summer':
        seasonalFactors.characteristics = ['Warm temperatures', 'Long daylight hours', 'Peak tourism'];
        seasonalFactors.travelConsiderations = ['Higher prices', 'Advanced booking recommended', 'Heat management'];
        break;
      case 'Fall':
        seasonalFactors.characteristics = ['Cooling temperatures', 'Fall foliage', 'Harvest season'];
        seasonalFactors.travelConsiderations = ['Shoulder season prices', 'Less crowded attractions', 'Pack layers for changing weather'];
        break;
      case 'Winter':
        seasonalFactors.characteristics = ['Cold temperatures', 'Possible snow', 'Holiday season'];
        seasonalFactors.travelConsiderations = ['Winter activities', 'Holiday pricing variations', 'Weather-appropriate clothing'];
        break;
    }
    
    return seasonalFactors;
  }

  /**
   * Enhance recommendations with additional data
   * @param {Array} recommendations - Basic recommendations
   * @returns {Array} - Enhanced recommendations
   */
  async enhanceRecommendations(recommendations) {
    try {
      // Get property details for each recommendation
      const enhancedRecommendations = [];
      
      for (const rec of recommendations) {
        // Fetch property details from database
        const { data, error } = await supabase
          .from('properties_j293sk4l59')
          .select('*')
          .eq('id', rec.propertyId)
          .single();
          
        if (error || !data) {
          // If property not found, use recommendation as is
          enhancedRecommendations.push(rec);
          continue;
        }
        
        // Enhance recommendation with property details
        const enhancedRec = {
          ...rec,
          property: {
            id: data.id,
            name: data.name,
            location: data.location,
            category: data.category,
            price: data.price,
            image: data.image,
            rating: data.rating
          },
          id: uuidv4(), // Add unique ID for the recommendation
          createdAt: new Date().toISOString()
        };
        
        enhancedRecommendations.push(enhancedRec);
      }
      
      return enhancedRecommendations;
    } catch (error) {
      console.error('Error enhancing recommendations:', error);
      return recommendations;
    }
  }

  /**
   * Predict travel intent based on user behavior and external factors
   * @param {Object} userBehavior - User behavior data
   * @param {Object} externalFactors - External factors
   * @returns {Object} - Travel intent prediction
   */
  async predictTravelIntent(userBehavior, externalFactors) {
    try {
      // Prepare features for prediction
      const features = {
        searchFrequency: userBehavior.searchFrequency || 0,
        priceMonitoring: userBehavior.priceAlerts?.length || 0,
        seasonalPatterns: userBehavior.seasonalActivity || {},
        socialSignals: await this.analyzeSocialMedia(userBehavior.socialConnections || []),
        economicIndicators: externalFactors.economicData || {},
        personalEvents: await this.detectPersonalEvents(userBehavior.calendar || [])
      };
      
      // Call OpenAI to predict travel intent
      const response = await this.callOpenAI({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are a travel intent prediction system. Analyze user behavior and external factors to predict likelihood of travel, suggested timeframe, budget range, and destination type."
          },
          {
            role: "user",
            content: `Predict travel intent based on these features: ${JSON.stringify(features)}`
          }
        ],
        response_format: { type: "json_object" }
      });
      
      // Parse and process the prediction
      const prediction = JSON.parse(response.choices[0].message.content);
      
      return {
        travelProbability: prediction.probability || 0,
        suggestedTimeframe: prediction.timeframe || 'Unknown',
        budgetRange: prediction.budget || 'Unknown',
        destinationType: prediction.destinationType || 'Unknown',
        confidence: prediction.confidence || 0
      };
    } catch (error) {
      console.error('Error predicting travel intent:', error);
      return {
        error: error.message,
        travelProbability: 0,
        suggestedTimeframe: 'Unknown',
        budgetRange: 'Unknown',
        destinationType: 'Unknown',
        confidence: 0
      };
    }
  }

  /**
   * Analyze social media connections for travel intent
   * @param {Array} socialConnections - User's social connections
   * @returns {Object} - Social media analysis
   */
  async analyzeSocialMedia(socialConnections) {
    // In a production system, this would analyze social media data
    // For now, return mock data based on input
    const travelRelatedCount = socialConnections.filter(conn => 
      conn.interests && conn.interests.some(i => 
        ['travel', 'vacation', 'holiday', 'trip'].includes(i.toLowerCase())
      )
    ).length;
    
    const travelScore = socialConnections.length > 0 ? 
      (travelRelatedCount / socialConnections.length) * 100 : 0;
    
    return {
      travelInterestScore: travelScore.toFixed(1),
      travelRelatedConnections: travelRelatedCount,
      totalConnections: socialConnections.length
    };
  }

  /**
   * Detect personal events that might trigger travel
   * @param {Array} calendarEvents - User's calendar events
   * @returns {Object} - Personal events analysis
   */
  async detectPersonalEvents(calendarEvents) {
    // Keywords that might indicate travel-triggering events
    const travelTriggerKeywords = [
      'vacation', 'holiday', 'trip', 'travel', 'flight', 'hotel',
      'wedding', 'anniversary', 'birthday', 'graduation', 'reunion',
      'conference', 'business trip', 'offsite', 'retreat'
    ];
    
    // Filter events that might trigger travel
    const potentialTravelEvents = calendarEvents.filter(event => 
      travelTriggerKeywords.some(keyword => 
        event.title?.toLowerCase().includes(keyword) || event.description?.toLowerCase().includes(keyword)
      )
    );
    
    // Group by month
    const eventsByMonth = {};
    potentialTravelEvents.forEach(event => {
      const date = new Date(event.date);
      const monthYear = `${date.getMonth() + 1}-${date.getFullYear()}`;
      
      if (!eventsByMonth[monthYear]) {
        eventsByMonth[monthYear] = [];
      }
      
      eventsByMonth[monthYear].push(event);
    });
    
    // Find month with most potential travel events
    let peakTravelMonth = null;
    let peakEventCount = 0;
    
    Object.entries(eventsByMonth).forEach(([monthYear, events]) => {
      if (events.length > peakEventCount) {
        peakEventCount = events.length;
        peakTravelMonth = monthYear;
      }
    });
    
    return {
      potentialTravelEventCount: potentialTravelEvents.length,
      peakTravelMonth,
      peakEventCount,
      eventsByMonth
    };
  }

  /**
   * Store user profile data in the database
   * @param {String} userId - User ID
   * @param {Object} profileData - Profile data to store
   * @returns {Object} - Result of storage operation
   */
  async storeUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles_ai2324fk')
        .upsert({
          user_id: userId,
          personality_traits: profileData.personalityTraits || {},
          travel_preferences: profileData.travelPreferences || {},
          behavioral_patterns: profileData.behavioralPatterns || {},
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error storing user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store AI recommendations in the database
   * @param {String} userId - User ID
   * @param {Array} recommendations - Recommendations to store
   * @returns {Object} - Result of storage operation
   */
  async storeRecommendations(userId, recommendations) {
    try {
      const recommendationsToStore = recommendations.map(rec => ({
        user_id: userId,
        property_id: rec.propertyId || rec.property?.id,
        match_score: rec.matchPercentage,
        match_reasons: rec.matchReasons,
        prediction_data: {
          optimalTiming: rec.optimalTiming,
          experiences: rec.experiences,
          budgetTips: rec.budgetTips,
          riskAssessment: rec.riskAssessment
        }
      }));

      const { data, error } = await supabase
        .from('ai_recommendations_ai2324fk')
        .upsert(recommendationsToStore)
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error storing recommendations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store AI insights in the database
   * @param {String} userId - User ID
   * @param {String} insightType - Type of insight
   * @param {Object} insightData - Insight data
   * @param {Number} confidenceScore - Confidence score
   * @returns {Object} - Result of storage operation
   */
  async storeInsight(userId, insightType, insightData, confidenceScore) {
    try {
      const { data, error } = await supabase
        .from('ai_insights_ai2324fk')
        .insert({
          user_id: userId,
          insight_type: insightType,
          insight_data: insightData,
          confidence_score: confidenceScore
        })
        .select();

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error storing insight:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export the service
module.exports = new AIService();
