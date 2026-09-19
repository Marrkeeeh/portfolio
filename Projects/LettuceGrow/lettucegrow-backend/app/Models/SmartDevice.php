<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;

class SmartDevice extends Model
{
	use HasFactory;

	/**
	 * The attributes that are mass assignable.
	 *
	 * @var array<int, string>
	 */
	protected $fillable = [
		'device_id',
		'device_pin',
		'user_id',
		'name',
		'location',
		'status',
		'date_added',
		'date_installed',
		'plant_growth',
		'settings',
		'wifi_data',
	];

	/**
	 * The attributes that should be cast.
	 *
	 * @var array<string, string>
	 */
	protected $casts = [
		'date_added' => 'datetime',
		'date_installed' => 'datetime',
		'plant_growth' => 'array',
		'settings' => 'array',
		'wifi_data' => 'array',
	];

	/**
	 * Get the user that owns the device.
	 */
	public function user(): BelongsTo
	{
		return $this->belongsTo(User::class);
	}

	/**
	 * Get the control history entries for this device.
	 */
	public function controlHistories()
	{
		return $this->hasMany(ControlHistory::class);
	}

	/**
	 * Get the device shares for this device.
	 */
	public function shares(): HasMany
	{
		return $this->hasMany(DeviceShare::class, 'device_id');
	}

	/**
	 * Get users who have access to this device (owner + shared users).
	 */
	public function getAccessibleUserIds(): array
	{
		$userIds = [];
		
		// Add owner
		if ($this->user_id) {
			$userIds[] = $this->user_id;
		}
		
		// Add shared users
		$sharedUserIds = $this->shares()->pluck('shared_with_user_id')->toArray();
		$userIds = array_merge($userIds, $sharedUserIds);
		
		return array_unique($userIds);
	}

	/**
	 * Check if a user has access to this device (owner or shared).
	 */
	public function isAccessibleBy(int $userId): bool
	{
		// Check if user is owner
		if ($this->user_id === $userId) {
			return true;
		}
		
		// Check if user has been shared this device
		return $this->shares()->where('shared_with_user_id', $userId)->exists();
	}
}
