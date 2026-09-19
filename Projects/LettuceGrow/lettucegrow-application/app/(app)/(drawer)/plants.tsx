import { useDialog } from "@/components/ui";
import { useAppearance } from "@/contexts/AppearanceContext";
import { useAuth } from "@/contexts/AuthContext";
import "@/global.css";
import {
  createPlant,
  deletePlant,
  formatPlantAge,
  formatHarvestCycle,
  getAllPlants,
  getStatusColor,
  getStatusLabel,
  getPlantTypeLabel,
  getSystemTypeLabel,
  harvestPlant,
  retirePlant,
  getHarvestRecommendation,
  getGrowthStageLabel,
  getGrowthStageColor,
  getGrowthStagePHRange,
  getGrowthStageECRange,
  HARVEST_QUALITIES,
  PLANT_STATUSES,
  updatePlant,
  type CreatePlantPayload,
  type HarvestPlantPayload,
  type RetirePlantPayload,
  type Plant,
  type PlantStatus,
  type HarvestQuality,
} from "@/services/plantService";
import { getDevicesForUser, type SmartDevice } from "@/services/deviceService";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform } from "react-native";

type TabType = "active" | "extracted";

export default function PlantsScreen() {
  const { theme } = useAppearance();
  const { token } = useAuth();
  const { showDialog, confirm, Dialog: DialogComponent } = useDialog();

  // State
  const [plants, setPlants] = React.useState<Plant[]>([]);
  const [devices, setDevices] = React.useState<SmartDevice[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabType>("active");
  
  // Add/Edit modal state
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [editingPlant, setEditingPlant] = React.useState<Plant | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState<number | null>(null);
  const [plantType, setPlantType] = React.useState("lettuce");
  const [systemType, setSystemType] = React.useState("nft");
  const [plantingDate, setPlantingDate] = React.useState(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [status, setStatus] = React.useState<PlantStatus>("seedling");
  const [quantity, setQuantity] = React.useState("1");
  const [batchName, setBatchName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  // Harvest modal state
  const [showHarvestModal, setShowHarvestModal] = React.useState(false);
  const [harvestingPlant, setHarvestingPlant] = React.useState<Plant | null>(null);
  const [harvestDate, setHarvestDate] = React.useState(new Date());
  const [showHarvestDatePicker, setShowHarvestDatePicker] = React.useState(false);
  const [yieldWeight, setYieldWeight] = React.useState("");
  const [quality, setQuality] = React.useState<HarvestQuality | null>(null);
  const [harvestNotes, setHarvestNotes] = React.useState("");
  const [isHarvesting, setIsHarvesting] = React.useState(false);

  // Harvest history modal state
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [historyPlant, setHistoryPlant] = React.useState<Plant | null>(null);
  
  // Pull to refresh state
  const [refreshing, setRefreshing] = React.useState(false);

  // Filtered plants by tab
  const filteredPlants = React.useMemo(() => {
    if (activeTab === "active") {
      return plants.filter((p) => p.status !== "retired");
    }
    return plants.filter((p) => p.status === "retired"); // "retired" is the backend status value
  }, [plants, activeTab]);

  // Load plants and devices
  React.useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [plantsRes, devicesRes] = await Promise.all([
        getAllPlants(token),
        getDevicesForUser(token),
      ]);
      
      if (plantsRes.success && plantsRes.data) {
        console.log('🌱 PlantsScreen: Loaded plants:', plantsRes.data.plants.length);
        plantsRes.data.plants.forEach((plant: Plant) => {
          console.log(`  Plant ${plant.id}: age=${plant.plant_age_days}, growth_stage=${plant.growth_stage || 'null'}, status=${plant.status}`);
        });
        setPlants(plantsRes.data.plants);
      }
      
      if (devicesRes.success && devicesRes.data?.devices) {
        const devices = devicesRes.data.devices;
        setDevices(devices);
        setSelectedDeviceId((prev) => {
          if (prev && devices.some((d) => d.id === prev)) {
            return prev;
          }
          return devices.length > 0 ? devices[0].id : null;
        });
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Reset add/edit form
  const resetForm = () => {
    setEditingPlant(null);
    setPlantType("lettuce");
    setSystemType("nft");
    setPlantingDate(new Date());
    setStatus("seedling");
    setQuantity("1");
    setBatchName("");
    setNotes("");
    if (devices.length > 0) {
      setSelectedDeviceId(devices[0].id);
    }
  };

  // Open add modal
  const handleAddPlant = () => {
    // Check if selected device already has an active plant
    if (selectedDeviceId) {
      const deviceActivePlant = plants.find(
        (p) => p.device_id === selectedDeviceId && p.status !== "retired"
      );
      
      if (deviceActivePlant) {
        showDialog({
          title: "Device has active plant",
          message: `This device already has an active plant (${getPlantTypeLabel(deviceActivePlant.plant_type)}). Please extract the current plant before adding a new one.`,
          icon: "alert-circle-outline",
          iconColor: theme.warning,
        });
        return;
      }
    }
    
    resetForm();
    setShowAddModal(true);
  };

  // Helper function to parse date string and get local date (same as card display)
  const parseLocalDate = (dateString: string): Date => {
    const tempDate = new Date(dateString);
    // Get LOCAL date components (same as what toLocaleDateString() uses)
    return new Date(tempDate.getFullYear(), tempDate.getMonth(), tempDate.getDate(), 12, 0, 0);
  };

  // Open edit modal
  const handleEditPlant = (plant: Plant) => {
    setEditingPlant(plant);
    setSelectedDeviceId(plant.device_id);
    setPlantType(plant.plant_type);
    setSystemType(plant.system_type);
    // Parse date as local time to avoid timezone shift
    setPlantingDate(parseLocalDate(plant.planting_date));
    setStatus(plant.status);
    setQuantity(String(plant.quantity));
    setBatchName(plant.batch_name || "");
    setNotes(plant.notes || "");
    setShowAddModal(true);
  };

  // Save plant (create or update)
  const handleSavePlant = async () => {
    if (!token || !selectedDeviceId) return;
    
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      showDialog({
        title: "Invalid quantity",
        message: "Please enter a valid quantity (at least 1).",
        icon: "alert-circle-outline",
        iconColor: theme.error,
      });
      return;
    }

    setIsSaving(true);
    try {
      // Format date using local time to avoid timezone shift
      const year = plantingDate.getFullYear();
      const month = String(plantingDate.getMonth() + 1).padStart(2, '0');
      const day = String(plantingDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      const payload: CreatePlantPayload = {
        plant_type: plantType,
        system_type: systemType,
        planting_date: formattedDate,
        status,
        quantity: qty,
        batch_name: batchName || null,
        notes: notes || null,
      };

      let result;
      if (editingPlant) {
        result = await updatePlant(selectedDeviceId, editingPlant.id, payload, token);
      } else {
        result = await createPlant(selectedDeviceId, payload, token);
      }

      if (result.success) {
        showDialog({
          title: editingPlant ? "Plant updated" : "Plant added",
          message: editingPlant
            ? "Your plant has been updated successfully."
            : "Your new plant has been added to the system.",
          icon: "checkmark-circle-outline",
          iconColor: theme.success,
        });
        setShowAddModal(false);
        loadData();
      } else {
        // Check for specific error code (from backend response)
        const errorMessage = result.code === 'device_has_active_plant'
          ? "This device already has an active plant. Please extract the current plant before adding a new one."
          : result.error || result.message || "Failed to save plant.";
        
        showDialog({
          title: "Error",
          message: errorMessage,
          icon: "alert-circle-outline",
          iconColor: theme.error,
        });
      }
    } catch (error: any) {
      showDialog({
        title: "Error",
        message: error.message || "An unexpected error occurred.",
        icon: "alert-circle-outline",
        iconColor: theme.error,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete plant
  const handleDeletePlant = async (plant: Plant) => {
    if (!token) return;

    const confirmed = await confirm({
      title: "Delete plant?",
      message: `Are you sure you want to delete this ${getPlantTypeLabel(plant.plant_type)}? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!confirmed) return;

    try {
      const result = await deletePlant(plant.device_id, plant.id, token);
      if (result.success) {
        showDialog({
          title: "Plant deleted",
          message: "The plant has been removed from your system.",
          icon: "checkmark-circle-outline",
          iconColor: theme.success,
        });
        loadData();
      } else {
        showDialog({
          title: "Error",
          message: result.error || result.message || "Failed to delete plant.",
          icon: "alert-circle-outline",
          iconColor: theme.error,
        });
      }
    } catch (error: any) {
      showDialog({
        title: "Error",
        message: error.message || "An unexpected error occurred.",
        icon: "alert-circle-outline",
        iconColor: theme.error,
      });
    }
  };

  // Open harvest modal
  const handleOpenHarvestModal = (plant: Plant) => {
    setHarvestingPlant(plant);
    setHarvestDate(new Date());
    setYieldWeight("");
    setQuality(null);
    setHarvestNotes("");
    setShowHarvestModal(true);
  };

  // Harvest plant (cut-and-come-again method - plant continues growing)
  const handleHarvestPlant = async () => {
    if (!token || !harvestingPlant) return;

    setIsHarvesting(true);
    try {
      // Format date using local time to avoid timezone shift
      const hYear = harvestDate.getFullYear();
      const hMonth = String(harvestDate.getMonth() + 1).padStart(2, '0');
      const hDay = String(harvestDate.getDate()).padStart(2, '0');
      const formattedHarvestDate = `${hYear}-${hMonth}-${hDay}`;
      
      const payload: HarvestPlantPayload = {
        harvest_date: formattedHarvestDate,
        yield_weight: yieldWeight ? parseFloat(yieldWeight) : null,
        quality,
        notes: harvestNotes || null,
      };

      const result = await harvestPlant(harvestingPlant.device_id, harvestingPlant.id, payload, token);

      if (result.success) {
        const harvestNum = (harvestingPlant.harvest_count || 0) + 1;
        showDialog({
          title: `Harvest #${harvestNum} recorded!`,
          message: `Your ${getPlantTypeLabel(harvestingPlant.plant_type)} will continue growing for the next harvest. Expect new leaves in 7-10 days.`,
          icon: "checkmark-circle-outline",
          iconColor: theme.success,
        });
        setShowHarvestModal(false);
        loadData();
      } else {
        showDialog({
          title: "Error",
          message: result.error || result.message || "Failed to record harvest.",
          icon: "alert-circle-outline",
          iconColor: theme.error,
        });
      }
    } catch (error: any) {
      showDialog({
        title: "Error",
        message: error.message || "An unexpected error occurred.",
        icon: "alert-circle-outline",
        iconColor: theme.error,
      });
    } finally {
      setIsHarvesting(false);
    }
  };

  // Extract plant (remove from system)
  const handleExtractPlant = async (plant: Plant) => {
    if (!token) return;

    const confirmed = await confirm({
      title: "Extract this plant?",
      message: `This will mark the ${getPlantTypeLabel(plant.plant_type)} as extracted and remove it from active growing. It has been harvested ${plant.harvest_count || 0} time(s).\n\nYou can still view it in the Extracted tab.`,
      confirmText: "Extract",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!confirmed) return;

    try {
      // Format date using local time to avoid timezone shift
      const now = new Date();
      const rYear = now.getFullYear();
      const rMonth = String(now.getMonth() + 1).padStart(2, '0');
      const rDay = String(now.getDate()).padStart(2, '0');
      const formattedRetiredAt = `${rYear}-${rMonth}-${rDay}`;
      
      const payload: RetirePlantPayload = {
        retired_at: formattedRetiredAt,
        reason: plant.harvest_count >= 3 ? "Quality degradation after multiple harvests" : undefined,
      };

      const result = await retirePlant(plant.device_id, plant.id, payload, token);
      
      if (result.success) {
        showDialog({
          title: "Plant extracted",
          message: `Your ${getPlantTypeLabel(plant.plant_type)} has been extracted after ${result.data?.summary?.total_harvests || plant.harvest_count} harvest(s) over ${result.data?.summary?.days_active || plant.plant_age_days} days.`,
          icon: "checkmark-circle-outline",
          iconColor: theme.success,
        });
        loadData();
      } else {
        showDialog({
          title: "Error",
          message: result.error || result.message || "Failed to extract plant.",
          icon: "alert-circle-outline",
          iconColor: theme.error,
        });
      }
    } catch (error: any) {
      showDialog({
        title: "Error",
        message: error.message || "An unexpected error occurred.",
        icon: "alert-circle-outline",
        iconColor: theme.error,
      });
    }
  };

  // Render plant card
  const renderPlantCard = ({ item: plant }: { item: Plant }) => {
    const device = devices.find((d) => d.id === plant.device_id);
    
    return (
      <View
        style={{
          backgroundColor: theme.card,
          borderRadius: 16,
          padding: 16,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>
                {getPlantTypeLabel(plant.plant_type)}
              </Text>
              {plant.batch_name && (
                <View
                  style={{
                    backgroundColor: theme.primary + "20",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 8,
                    marginLeft: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, color: theme.primary, fontWeight: "500" }}>
                    {plant.batch_name}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 13, color: theme.textSecondary }}>
              {getSystemTypeLabel(plant.system_type)} • {plant.quantity} plant{plant.quantity > 1 ? "s" : ""}
            </Text>
          </View>
          
          {/* Status Badge */}
          <View
            style={{
              backgroundColor: getStatusColor(plant.status) + "20",
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: getStatusColor(plant.status) }}>
              {getStatusLabel(plant.status)}
            </Text>
          </View>
        </View>

        {/* Info Row */}
        <View style={{ flexDirection: "row", marginTop: 12, gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 2 }}>Plant Age</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
              {formatPlantAge(plant.plant_age_days)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 2 }}>Planted</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
              {new Date(plant.planting_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 2 }}>Harvests</Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: plant.harvest_count > 0 ? theme.success : theme.text }}>
              {plant.harvest_count || 0}x
            </Text>
          </View>
        </View>

        {/* Growth Stage & Recommendations */}
        {plant.growth_stage && !plant.is_retired && (
          <View style={{ marginTop: 12, backgroundColor: theme.background, padding: 12, borderRadius: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <View
                style={{
                  backgroundColor: getGrowthStageColor(plant.growth_stage) + "20",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                  marginRight: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: getGrowthStageColor(plant.growth_stage) }}>
                  {getGrowthStageLabel(plant.growth_stage)} Stage
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                Days {plant.plant_age_days} of {plant.growth_stage === 'seedling' ? '20' : '45+'}
              </Text>
            </View>
            
            {/* pH & EC Recommendations */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              {getGrowthStagePHRange(plant.growth_stage) && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>pH Range</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>
                    {getGrowthStagePHRange(plant.growth_stage)!.min}-{getGrowthStagePHRange(plant.growth_stage)!.max}
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.textTertiary }}>
                    Target: {getGrowthStagePHRange(plant.growth_stage)!.target}
                  </Text>
                </View>
              )}
              {getGrowthStageECRange(plant.growth_stage) && (
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, marginBottom: 2 }}>EC Range</Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>
                    {getGrowthStageECRange(plant.growth_stage)!.min}-{getGrowthStageECRange(plant.growth_stage)!.max} dS/m
                  </Text>
                  <Text style={{ fontSize: 10, color: theme.textTertiary }}>
                    Target: {getGrowthStageECRange(plant.growth_stage)!.target} dS/m
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Device */}
        {device && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Ionicons name="hardware-chip-outline" size={14} color={theme.textSecondary} />
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 4 }}>
              {device.name || device.device_id}
            </Text>
          </View>
        )}

        {/* Notes */}
        {plant.notes && (
          <View style={{ marginTop: 12, backgroundColor: theme.background, padding: 10, borderRadius: 8 }}>
            <Text style={{ fontSize: 13, color: theme.textSecondary, fontStyle: "italic" }}>
              {plant.notes}
            </Text>
          </View>
        )}

        {/* Harvest History Summary + Button */}
        {plant.harvest_count > 0 && (
          <View style={{ marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: theme.textSecondary,
                    marginLeft: 4,
                  }}
                >
                  {plant.harvest_count} harvest{plant.harvest_count > 1 ? "s" : ""} recorded
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setHistoryPlant(plant);
                  setShowHistoryModal(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                  gap: 4,
                }}
              >
                <Ionicons name="list-outline" size={14} color={theme.primary} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: theme.primary }}>
                  View history
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Extracted date */}
        {plant.is_retired && plant.retired_at && (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Ionicons name="close-circle-outline" size={14} color={theme.textSecondary} />
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginLeft: 4 }}>
              Extracted on {new Date(plant.retired_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={{ flexDirection: "row", marginTop: 16, gap: 8 }}>
          {!plant.is_retired && (
            <Pressable
              onPress={() => handleOpenHarvestModal(plant)}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.success,
                paddingVertical: 10,
                borderRadius: 10,
                gap: 6,
              }}
            >
              <Ionicons name="leaf" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                Harvest {plant.harvest_count > 0 ? `#${plant.harvest_count + 1}` : ''}
              </Text>
            </Pressable>
          )}
          
          {!plant.is_retired && (
            <Pressable
              onPress={() => handleEditPlant(plant)}
              style={{
                flex: 0.5,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primary,
                paddingVertical: 10,
                borderRadius: 10,
                gap: 6,
              }}
            >
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Edit</Text>
            </Pressable>
          )}
          
          {!plant.is_retired && (
            <Pressable
              onPress={() => handleExtractPlant(plant)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: theme.warning + "20",
              }}
            >
              <Ionicons name="exit-outline" size={18} color={theme.warning} />
            </Pressable>
          )}
          
          <Pressable
            onPress={() => handleDeletePlant(plant)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: theme.error + "15",
            }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.error} />
          </Pressable>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={{ alignItems: "center", paddingVertical: 60 }}>
      <Ionicons
        name={activeTab === "active" ? "leaf-outline" : "archive-outline"}
        size={64}
        color={theme.textSecondary}
      />
      <Text style={{ fontSize: 18, fontWeight: "600", color: theme.text, marginTop: 16 }}>
        {activeTab === "active" ? "No active plants" : "No extracted plants"}
      </Text>
      <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4, textAlign: "center" }}>
        {activeTab === "active"
          ? "Add your first plant to start tracking its growth."
          : "Plants you've extracted will appear here."}
      </Text>
      {activeTab === "active" && devices.length > 0 && (
        <Pressable
          onPress={handleAddPlant}
          style={{
            marginTop: 20,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: theme.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
            gap: 8,
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "600" }}>Add Plant</Text>
        </Pressable>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 12, color: theme.textSecondary }}>Loading plants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={["bottom"]}>
      <DialogComponent />

      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: "700", color: theme.text }}>Plants</Text>
            <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 2 }}>
              {plants.filter((p) => p.status !== "retired").length} active •{" "}
              {plants.filter((p) => p.status === "retired").length} extracted
            </Text>
          </View>
          {devices.length > 0 && (
            <Pressable
              onPress={handleAddPlant}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.primary,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 12,
                gap: 6,
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600" }}>Add Plant</Text>
            </Pressable>
          )}
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            marginTop: 16,
            backgroundColor: theme.card,
            borderRadius: 12,
            padding: 4,
          }}
        >
          {(["active", "extracted"] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: activeTab === tab ? theme.primary : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  color: activeTab === tab ? "#fff" : theme.textSecondary,
                }}
              >
                {tab === "active" ? "Active" : "Extracted"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Plant List */}
      <FlatList
        data={filteredPlants}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPlantCard}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Pressable onPress={() => setShowAddModal(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={28} color={theme.text} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>
              {editingPlant ? "Edit Plant" : "Add Plant"}
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Device Selector */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Device *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {devices
                    .filter((d) => d.user_id !== null) // Only owned devices
                    .map((device) => {
                      const hasActivePlant = plants.some(
                        (p) => p.device_id === device.id && p.status !== "retired"
                      );
                      const isSelected = selectedDeviceId === device.id;
                      
                      return (
                        <Pressable
                          key={device.id}
                          onPress={() => {
                            if (hasActivePlant && !editingPlant) {
                              showDialog({
                                title: "Device has active plant",
                                message: `This device already has an active plant. Please extract the current plant before adding a new one.`,
                                icon: "alert-circle-outline",
                                iconColor: theme.warning,
                              });
                            } else {
                              setSelectedDeviceId(device.id);
                            }
                          }}
                          style={{
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                            borderRadius: 10,
                            borderWidth: 2,
                            borderColor: isSelected ? theme.primary : hasActivePlant && !editingPlant ? theme.warning : theme.border,
                            backgroundColor: isSelected ? theme.primary + "15" : hasActivePlant && !editingPlant ? theme.warning + "15" : theme.card,
                            opacity: hasActivePlant && !editingPlant ? 0.7 : 1,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text
                              style={{
                                fontWeight: "600",
                                color: isSelected ? theme.primary : theme.text,
                              }}
                            >
                              {device.name || device.device_id}
                            </Text>
                            {hasActivePlant && !editingPlant && (
                              <Ionicons name="warning" size={14} color={theme.warning} />
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                </View>
              </ScrollView>
              {selectedDeviceId && !editingPlant && plants.some(
                (p) => p.device_id === selectedDeviceId && p.status !== "retired"
              ) && (
                <View
                  style={{
                    marginTop: 8,
                    padding: 10,
                    backgroundColor: theme.warning + "15",
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="information-circle" size={16} color={theme.warning} />
                  <Text style={{ fontSize: 12, color: theme.warning, flex: 1 }}>
                    This device already has an active plant. Extract it first to add a new one.
                  </Text>
                </View>
              )}
            </View>

            {/* Plant Type & System Type - Fixed values for LettuceGrow */}
            <View style={{ marginBottom: 20 }}>
              <View
                style={{
                  flexDirection: "row",
                  gap: 12,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                    Plant Type
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="leaf" size={18} color={theme.primary} />
                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: "500" }}>
                      Lettuce
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                    System Type
                  </Text>
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons name="water" size={18} color={theme.primary} />
                    <Text style={{ fontSize: 16, color: theme.text, fontWeight: "500" }}>
                      NFT
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Planting Date */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Planting Date *
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 16, color: theme.text }}>
                  {plantingDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={plantingDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  maximumDate={new Date()}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    setShowDatePicker(Platform.OS === "ios");
                    if (date) setPlantingDate(date);
                  }}
                />
              )}
            </View>

            {/* Status */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Status
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {PLANT_STATUSES.filter((s) => s.value !== "retired").map((s) => (
                  <Pressable
                    key={s.value}
                    onPress={() => setStatus(s.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: status === s.value ? s.color : theme.border,
                      backgroundColor: status === s.value ? s.color + "20" : theme.card,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        color: status === s.value ? s.color : theme.text,
                      }}
                    >
                      {s.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Quantity */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Quantity
              </Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={theme.textSecondary}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: theme.text,
                }}
              />
            </View>

            {/* Batch Name */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Batch Name (Optional)
              </Text>
              <TextInput
                value={batchName}
                onChangeText={setBatchName}
                placeholder="e.g., January Batch, Batch 1"
                placeholderTextColor={theme.textSecondary}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: theme.text,
                }}
              />
            </View>

            {/* Notes */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Notes (Optional)
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                placeholder="Add any notes about this plant..."
                placeholderTextColor={theme.textSecondary}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: theme.text,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSavePlant}
              disabled={isSaving || !selectedDeviceId}
              style={{
                backgroundColor: isSaving || !selectedDeviceId ? theme.textSecondary : theme.primary,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                  {editingPlant ? "Update Plant" : "Add Plant"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Harvest Modal */}
      <Modal visible={showHarvestModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Pressable onPress={() => setShowHarvestModal(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={28} color={theme.text} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>
              Record Harvest
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Plant Info */}
            {harvestingPlant && (
              <View
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                }}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>
                      {getPlantTypeLabel(harvestingPlant.plant_type)}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>
                      {formatPlantAge(harvestingPlant.plant_age_days)} • {harvestingPlant.quantity} plant
                      {harvestingPlant.quantity > 1 ? "s" : ""}
                    </Text>
                  </View>
                  {harvestingPlant.harvest_count > 0 && (
                    <View
                      style={{
                        backgroundColor: theme.success + "20",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: theme.success }}>
                        {harvestingPlant.harvest_count}x harvested
                      </Text>
                    </View>
                  )}
                </View>
                
                {/* Harvest recommendation */}
                <View
                  style={{
                    marginTop: 12,
                    padding: 10,
                    backgroundColor: theme.info + "15",
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="information-circle" size={18} color={theme.info} />
                  <Text style={{ fontSize: 13, color: theme.info, marginLeft: 8, flex: 1 }}>
                    {getHarvestRecommendation(harvestingPlant.harvest_count || 0)}
                  </Text>
                </View>
              </View>
            )}

            {/* Harvest Date */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Harvest Date *
              </Text>
              <Pressable
                onPress={() => setShowHarvestDatePicker(true)}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text style={{ fontSize: 16, color: theme.text }}>
                  {harvestDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
              </Pressable>
              {showHarvestDatePicker && (
                <DateTimePicker
                  value={harvestDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  minimumDate={harvestingPlant ? new Date(harvestingPlant.planting_date) : undefined}
                  maximumDate={new Date()}
                  onChange={(event: DateTimePickerEvent, date?: Date) => {
                    setShowHarvestDatePicker(Platform.OS === "ios");
                    if (date) setHarvestDate(date);
                  }}
                />
              )}
            </View>

            {/* Yield Weight */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Yield Weight (grams) - Optional
              </Text>
              <TextInput
                value={yieldWeight}
                onChangeText={setYieldWeight}
                keyboardType="decimal-pad"
                placeholder="e.g., 250"
                placeholderTextColor={theme.textSecondary}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: theme.text,
                }}
              />
            </View>

            {/* Quality */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Quality (Optional)
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {HARVEST_QUALITIES.map((q) => (
                  <Pressable
                    key={q.value}
                    onPress={() => setQuality(quality === q.value ? null : q.value)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: quality === q.value ? q.color : theme.border,
                      backgroundColor: quality === q.value ? q.color + "20" : theme.card,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        color: quality === q.value ? q.color : theme.text,
                      }}
                    >
                      {q.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text, marginBottom: 8 }}>
                Notes (Optional)
              </Text>
              <TextInput
                value={harvestNotes}
                onChangeText={setHarvestNotes}
                multiline
                numberOfLines={3}
                placeholder="Add any notes about this harvest..."
                placeholderTextColor={theme.textSecondary}
                style={{
                  backgroundColor: theme.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: theme.text,
                  minHeight: 100,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Harvest Button */}
            <Pressable
              onPress={handleHarvestPlant}
              disabled={isHarvesting}
              style={{
                backgroundColor: isHarvesting ? theme.textSecondary : theme.success,
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                marginBottom: 20,
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isHarvesting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="leaf" size={20} color="#fff" />
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                    Record Harvest
                  </Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Harvest History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent={false}>
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Modal Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: theme.border,
            }}
          >
            <Pressable onPress={() => setShowHistoryModal(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={28} color={theme.text} />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>
              Harvest History
            </Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {historyPlant ? (
              <>
                {/* Plant Summary */}
                <View
                  style={{
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>
                    {getPlantTypeLabel(historyPlant.plant_type)}
                  </Text>
                  <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 4 }}>
                    {formatPlantAge(historyPlant.plant_age_days)} •{" "}
                    {historyPlant.quantity} plant{historyPlant.quantity > 1 ? "s" : ""} •{" "}
                    {historyPlant.harvest_count} harvest
                    {historyPlant.harvest_count > 1 ? "s" : ""}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 4 }}>
                    Planted on {new Date(historyPlant.planting_date).toLocaleDateString()}
                  </Text>
                </View>

                {/* Harvest List */}
                {historyPlant.harvests && historyPlant.harvests.length > 0 ? (
                  <View
                    style={{
                      backgroundColor: theme.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: theme.border,
                      padding: 12,
                      gap: 8,
                    }}
                  >
                    {historyPlant.harvests.map((harvest, index) => (
                      <View
                        key={harvest.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 8,
                          borderBottomWidth:
                            index < historyPlant.harvests!.length - 1 ? 1 : 0,
                          borderBottomColor: theme.border,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                          <View
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 14,
                              backgroundColor: theme.success + "20",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 10,
                            }}
                          >
                            <Text
                              style={{ fontSize: 12, fontWeight: "700", color: theme.success }}
                            >
                              {harvest.harvest_cycle}
                            </Text>
                          </View>
                          <View>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "600",
                                color: theme.text,
                              }}
                            >
                              {formatHarvestCycle(harvest.harvest_cycle)}
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                              {new Date(harvest.harvest_date).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          {harvest.yield_weight && (
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: "600",
                                color: theme.text,
                              }}
                            >
                              {harvest.yield_weight}g
                            </Text>
                          )}
                          {harvest.quality && (
                            <View
                              style={{
                                backgroundColor:
                                  harvest.quality === "excellent"
                                    ? "#4CAF50" + "20"
                                    : harvest.quality === "good"
                                    ? "#8BC34A" + "20"
                                    : harvest.quality === "fair"
                                    ? "#FFC107" + "20"
                                    : "#F44336" + "20",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                marginTop: 2,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color:
                                    harvest.quality === "excellent"
                                      ? "#4CAF50"
                                      : harvest.quality === "good"
                                      ? "#8BC34A"
                                      : harvest.quality === "fair"
                                      ? "#FFC107"
                                      : "#F44336",
                                  textTransform: "capitalize",
                                }}
                              >
                                {harvest.quality}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View
                    style={{
                      alignItems: "center",
                      paddingVertical: 40,
                    }}
                  >
                    <Ionicons
                      name="leaf-outline"
                      size={48}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: theme.text,
                        marginTop: 8,
                      }}
                    >
                      No harvests recorded yet
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.textSecondary,
                        marginTop: 4,
                        textAlign: "center",
                      }}
                    >
                      Record your first harvest to start tracking this plant&apos;s performance.
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

