import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceSelection } from "@/contexts/DeviceSelectionContext";
import { useDeviceMonitoring } from "@/contexts/DeviceMonitoringContext";
import "@/global.css";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useMemo } from "react";
import { ScrollView, Text, View, ActivityIndicator, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getDeviceById, getSensorHistory, type SensorHistoryData } from "@/services/deviceService";

interface AnalyticsMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export default function AnalyticsScreen() {
  const { theme, colorScheme } = useAppearance();
  const { token } = useAuth();
  const { selectedDeviceId } = useDeviceSelection();
  const { telemetry } = useDeviceMonitoring();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deviceData, setDeviceData] = useState<any>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorHistoryData | null>(null);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    if (!token || !selectedDeviceId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch device data and sensor history in parallel
      const [deviceResponse, sensorHistoryResponse] = await Promise.all([
        getDeviceById(selectedDeviceId, token),
        getSensorHistory(selectedDeviceId, token, 4),
      ]);

      if (deviceResponse.success && deviceResponse.data?.device) {
        setDeviceData(deviceResponse.data.device);
      }

      if (sensorHistoryResponse.success && sensorHistoryResponse.data) {
        setSensorHistory(sensorHistoryResponse.data);
      }
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [token, selectedDeviceId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  // Calculate analytics metrics from backend data - Focus on sensors only
  const analyticsData = useMemo<AnalyticsMetric[]>(() => {
    if (!deviceData && !sensorHistory) {
      return [];
    }

    const metrics: AnalyticsMetric[] = [];
    const device = deviceData;
    const telemetryData = device?.settings?.telemetry || {};
    const currentTelemetry = telemetry || telemetryData;
    
    // Helper function to calculate trend from sensor history
    const calculateSensorTrend = (sensorType: string, currentValue: number | null | undefined) => {
      if (!sensorHistory || !currentValue) {
        return { change: '0%', trend: 'neutral' as const };
      }

      const trends = sensorHistory.weekly_trends[sensorType as keyof typeof sensorHistory.weekly_trends];
      if (!trends || trends.length < 2) {
        return { change: '0%', trend: 'neutral' as const };
      }

      const firstWeek = trends[0].avg;
      const lastWeek = trends[trends.length - 1].avg;
      const change = ((lastWeek - firstWeek) / firstWeek) * 100;
      const changeStr = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      const trend: 'up' | 'down' | 'neutral' = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';
      
      return { change: changeStr, trend };
    };

    // 1. pH Level
    const phLevel = currentTelemetry.ph_level;
    if (phLevel !== null && phLevel !== undefined) {
      const { change, trend } = calculateSensorTrend('ph', phLevel);
      metrics.push({
        id: '1',
        title: 'pH Level',
        value: phLevel.toFixed(2),
        change,
        trend,
        icon: 'water',
      });
    }

    // 2. EC Level
    const ecLevel = currentTelemetry.ec_level;
    if (ecLevel !== null && ecLevel !== undefined) {
      const { change, trend } = calculateSensorTrend('ec', ecLevel);
      metrics.push({
        id: '2',
        title: 'EC Level',
        value: `${ecLevel.toFixed(2)} mS/cm`,
        change,
        trend,
        icon: 'leaf',
      });
    }

    // 3. Temperature & Dissolved Oxygen (Combined)
    const temperature = currentTelemetry.temperature;
    const dissolvedO2 = currentTelemetry.do_data;
    if ((temperature !== null && temperature !== undefined) || (dissolvedO2 !== null && dissolvedO2 !== undefined)) {
      // Calculate combined trend (use temperature trend as primary)
      const tempTrend = temperature !== null && temperature !== undefined 
        ? calculateSensorTrend('temperature', temperature)
        : { change: '0%', trend: 'neutral' as const };
      const doTrend = dissolvedO2 !== null && dissolvedO2 !== undefined
        ? calculateSensorTrend('dissolved_oxygen', dissolvedO2)
        : { change: '0%', trend: 'neutral' as const };
      
      // Use the more significant trend
      const combinedTrend = tempTrend.trend !== 'neutral' ? tempTrend : doTrend;
      
      let combinedValue = '';
      if (temperature !== null && temperature !== undefined && dissolvedO2 !== null && dissolvedO2 !== undefined) {
        combinedValue = `${temperature.toFixed(1)}°C / ${dissolvedO2.toFixed(2)} mg/L`;
      } else if (temperature !== null && temperature !== undefined) {
        combinedValue = `${temperature.toFixed(1)}°C`;
      } else if (dissolvedO2 !== null && dissolvedO2 !== undefined) {
        combinedValue = `${dissolvedO2.toFixed(2)} mg/L`;
      }
      
      metrics.push({
        id: '3',
        title: 'Temp / DO',
        value: combinedValue,
        change: combinedTrend.change,
        trend: combinedTrend.trend,
        icon: 'thermometer',
      });
    }

    // 5. Turbidity (if available)
    const turbidity = currentTelemetry.turbidity;
    if (turbidity !== null && turbidity !== undefined) {
      const { change, trend } = calculateSensorTrend('turbidity', turbidity);
      metrics.push({
        id: '5',
        title: 'Turbidity',
        value: `${turbidity.toFixed(2)} NTU`,
        change,
        trend,
        icon: 'eye',
      });
    }

    return metrics;
  }, [deviceData, sensorHistory, telemetry]);

  const getTrendColor = (trend: string) => {
    if (trend === 'up') return theme.success;
    if (trend === 'down') return theme.error;
    return theme.textSecondary;
  };

  // Generate insights based on analytics data
  const insights = useMemo(() => {
    if (!analyticsData.length) return null;

    const ecLevel = telemetry?.ec_level || deviceData?.settings?.telemetry?.ec_level;
    const phLevel = telemetry?.ph_level || deviceData?.settings?.telemetry?.ph_level;
    const temperature = telemetry?.temperature || deviceData?.settings?.telemetry?.temperature;

    const insightsList = [];

    // Check EC levels
    if (ecLevel) {
      if (ecLevel < 1.4) {
        insightsList.push({
          icon: 'warning-outline',
          color: theme.warning,
          title: 'Low Nutrient Levels',
          message: 'EC level is below optimal range. Consider adding nutrients to improve growth.',
        });
      } else if (ecLevel > 2.2) {
        insightsList.push({
          icon: 'warning-outline',
          color: theme.error,
          title: 'High Nutrient Levels',
          message: 'EC level is above optimal range. Consider diluting the solution.',
        });
      }
    }

    // Check pH levels
    if (phLevel) {
      if (phLevel < 5.5) {
        insightsList.push({
          icon: 'warning-outline',
          color: theme.warning,
          title: 'Low pH Detected',
          message: 'pH level is below optimal range. Consider adding pH up solution.',
        });
      } else if (phLevel > 6.5) {
        insightsList.push({
          icon: 'warning-outline',
          color: theme.warning,
          title: 'High pH Detected',
          message: 'pH level is above optimal range. Consider adding pH down solution.',
        });
      }
    }

    // Positive insight if everything is optimal
    if (insightsList.length === 0 && ecLevel && phLevel && 
        ecLevel >= 1.4 && ecLevel <= 2.2 && 
        phLevel >= 5.5 && phLevel <= 6.5) {
      insightsList.push({
        icon: 'bulb-outline',
        color: theme.success,
        title: 'Optimal Growth Conditions',
        message: 'Your plants are showing excellent growth rates. Continue current nutrient and lighting schedule.',
      });
    }

    return insightsList.length > 0 ? insightsList[0] : null;
  }, [analyticsData, telemetry, deviceData, theme]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={['bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 16, fontSize: 14, color: theme.textSecondary }}>
            Loading analytics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedDeviceId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={['bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="analytics-outline" size={64} color={theme.textTertiary} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 8, textAlign: 'center' }}>
            No Device Selected
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center' }}>
            Please select a device to view analytics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={['bottom']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.error} style={{ marginBottom: 16 }} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: theme.text, marginBottom: 8, textAlign: 'center' }}>
            Error Loading Analytics
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundSecondary }} edges={['bottom']}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 8 }}>
            Analytics
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 24 }}>
            Track your system performance and insights
          </Text>

          {/* Analytics Cards Grid */}
          {analyticsData.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6, marginBottom: 24 }}>
              {analyticsData.map((item) => {
                const trendColor = getTrendColor(item.trend);
                // Use 50% width for 2 cards per row (perfect 2x2 grid for 4 cards)
                
                return (
                  <View key={item.id} style={{ width: '50%', padding: 6 }}>
                    <View
                      style={{
                        backgroundColor: theme.background,
                        borderRadius: 12,
                        padding: 16,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                        elevation: 2,
                        minHeight: 120,
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <Ionicons name={item.icon as any} size={24} color={theme.primary} />
                        {item.trend !== 'neutral' && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons 
                              name={item.trend === 'up' ? 'arrow-up' : 'arrow-down'} 
                              size={12} 
                              color={trendColor} 
                              style={{ marginRight: 2 }}
                            />
                            <Text style={{ fontSize: 12, fontWeight: '600', color: trendColor }}>
                              {item.change}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View>
                        <Text style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 4 }} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }} numberOfLines={2}>
                          {item.value}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: 12,
                padding: 24,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 150,
                marginBottom: 24,
              }}
            >
              <Ionicons name="analytics-outline" size={48} color={theme.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 14, color: theme.textTertiary, textAlign: 'center' }}>
                No analytics data available yet
              </Text>
            </View>
          )}

          {/* Recent Values Section */}
          {sensorHistory && (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 12 }}>
                Recent Values
              </Text>
              
              {Object.entries(sensorHistory.recent_values).map(([sensorType, values]) => {
                if (!values || values.length === 0) return null;
                
                const sensorLabels: Record<string, { label: string; unit: string; icon: string }> = {
                  ph: { label: 'pH Level', unit: '', icon: 'water' },
                  ec: { label: 'EC Level', unit: ' mS/cm', icon: 'leaf' },
                  temperature: { label: 'Temperature', unit: '°C', icon: 'thermometer' },
                  dissolved_oxygen: { label: 'Dissolved Oxygen', unit: ' mg/L', icon: 'airplane' },
                  turbidity: { label: 'Turbidity', unit: ' NTU', icon: 'eye' },
                };
                
                const sensorInfo = sensorLabels[sensorType] || { label: sensorType, unit: '', icon: 'pulse' };
                const latestValue = values[values.length - 1];
                
                return (
                  <View
                    key={sensorType}
                    style={{
                      backgroundColor: theme.background,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name={sensorInfo.icon as any} size={20} color={theme.primary} style={{ marginRight: 8 }} />
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, flex: 1 }}>
                        {sensorInfo.label}
                      </Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
                        {latestValue.value.toFixed(2)}{sensorInfo.unit}
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
                      {values.slice(-5).map((point, idx) => (
                        <View
                          key={idx}
                          style={{
                            backgroundColor: theme.backgroundSecondary,
                            borderRadius: 8,
                            padding: 8,
                            minWidth: 60,
                            alignItems: 'center',
                            margin: 4,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                            {point.value.toFixed(1)}
                          </Text>
                          <Text style={{ fontSize: 10, color: theme.textSecondary, marginTop: 2 }}>
                            {new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}

              {/* Weekly Trends Section */}
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginTop: 8, marginBottom: 12 }}>
                Weekly Trends
              </Text>
              
              {Object.entries(sensorHistory.weekly_trends).map(([sensorType, trends]) => {
                if (!trends || trends.length === 0) return null;
                
                const sensorLabels: Record<string, { label: string; unit: string; icon: string }> = {
                  ph: { label: 'pH Level', unit: '', icon: 'water' },
                  ec: { label: 'EC Level', unit: ' mS/cm', icon: 'leaf' },
                  temperature: { label: 'Temperature', unit: '°C', icon: 'thermometer' },
                  dissolved_oxygen: { label: 'Dissolved Oxygen', unit: ' mg/L', icon: 'airplane' },
                  turbidity: { label: 'Turbidity', unit: ' NTU', icon: 'eye' },
                };
                
                const sensorInfo = sensorLabels[sensorType] || { label: sensorType, unit: '', icon: 'pulse' };
                
                // Calculate trend direction
                let trendDirection: 'up' | 'down' | 'neutral' = 'neutral';
                let trendPercent = '0%';
                if (trends.length >= 2) {
                  const firstWeek = trends[0].avg;
                  const lastWeek = trends[trends.length - 1].avg;
                  const change = ((lastWeek - firstWeek) / firstWeek) * 100;
                  trendPercent = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
                  trendDirection = change > 1 ? 'up' : change < -1 ? 'down' : 'neutral';
                }
                
                return (
                  <View
                    key={sensorType}
                    style={{
                      backgroundColor: theme.background,
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Ionicons name={sensorInfo.icon as any} size={20} color={theme.primary} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>
                          {sensorInfo.label}
                        </Text>
                      </View>
                      {trendDirection !== 'neutral' && (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons 
                            name={trendDirection === 'up' ? 'arrow-up' : 'arrow-down'} 
                            size={14} 
                            color={getTrendColor(trendDirection)} 
                            style={{ marginRight: 4 }}
                          />
                          <Text style={{ fontSize: 12, fontWeight: '600', color: getTrendColor(trendDirection) }}>
                            {trendPercent}
                          </Text>
                        </View>
                      )}
                    </View>
                    
                    {trends.map((week, idx) => {
                      const weekDate = new Date(week.week_start);
                      const weekLabel = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;
                      
                      return (
                        <View
                          key={idx}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: 8,
                            borderBottomWidth: idx < trends.length - 1 ? 1 : 0,
                            borderBottomColor: theme.backgroundSecondary,
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}>
                              Week of {weekLabel}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                              <View style={{ marginRight: 16 }}>
                                <Text style={{ fontSize: 10, color: theme.textTertiary }}>Avg</Text>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                                  {week.avg.toFixed(2)}{sensorInfo.unit}
                                </Text>
                              </View>
                              <View style={{ marginRight: 16 }}>
                                <Text style={{ fontSize: 10, color: theme.textTertiary }}>Min</Text>
                                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                                  {week.min.toFixed(2)}{sensorInfo.unit}
                                </Text>
                              </View>
                              <View style={{ marginRight: 16 }}>
                                <Text style={{ fontSize: 10, color: theme.textTertiary }}>Max</Text>
                                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                                  {week.max.toFixed(2)}{sensorInfo.unit}
                                </Text>
                              </View>
                              <View>
                                <Text style={{ fontSize: 10, color: theme.textTertiary }}>Readings</Text>
                                <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                                  {week.count}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </>
          )}
          
          {!sensorHistory && (
            <View
              style={{
                backgroundColor: theme.background,
                borderRadius: 12,
                padding: 24,
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 150,
                marginBottom: 24,
              }}
            >
              <Ionicons name="stats-chart-outline" size={48} color={theme.textTertiary} style={{ marginBottom: 12 }} />
              <Text style={{ fontSize: 14, color: theme.textTertiary, textAlign: 'center' }}>
                No sensor history data available yet
              </Text>
            </View>
          )}

          {/* Insights Section */}
          {insights && (
            <>
              <Text style={{ fontSize: 20, fontWeight: '700', color: theme.text, marginBottom: 12 }}>
                Insights
              </Text>
              
              <View
                style={{
                  backgroundColor: theme.background,
                  borderRadius: 12,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Ionicons name={insights.icon as any} size={20} color={insights.color} style={{ marginRight: 12, marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 4 }}>
                      {insights.title}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary }}>
                      {insights.message}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

