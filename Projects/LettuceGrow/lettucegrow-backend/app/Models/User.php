<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'fname',
        'mname',
        'lname',
        'username',
        'email',
        'password',
        'profile_img',
        'role',
        'phonenumber',
        'address',
        'email_verified_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'email_verified_at' => 'datetime',
        ];
    }

    /**
     * Get the user's full name.
     *
     * @return string
     */
    public function getFullNameAttribute(): string
    {
        $name = $this->fname;
        if ($this->mname) {
            $name .= ' ' . $this->mname;
        }
        $name .= ' ' . $this->lname;
        return $name;
    }

    /**
     * Get the user's display name (alias for full_name).
     */
    public function getNameAttribute(): string
    {
        return $this->full_name;
    }

    /**
     * Set the user's display name and map it onto fname / mname / lname.
     */
    public function setNameAttribute(string $value): void
    {
        $fullName = trim($value);

        if ($fullName === '') {
            $this->attributes['fname'] = '';
            $this->attributes['mname'] = null;
            $this->attributes['lname'] = '';

            return;
        }

        $parts = preg_split('/\s+/', $fullName);

        $this->attributes['fname'] = $parts[0] ?? '';

        if (count($parts) === 1) {
            $this->attributes['mname'] = null;
            $this->attributes['lname'] = $parts[0];
        } elseif (count($parts) === 2) {
            $this->attributes['mname'] = null;
            $this->attributes['lname'] = $parts[1];
        } else {
            $this->attributes['mname'] = $parts[1];
            $this->attributes['lname'] = implode(' ', array_slice($parts, 2));
        }
    }

    /**
     * Get the OTPs for the user.
     */
    public function otps(): HasMany
    {
        return $this->hasMany(Otp::class);
    }

	/**
	 * Get the smart devices owned by the user.
	 */
	public function smartDevices(): HasMany
	{
		return $this->hasMany(SmartDevice::class);
	}

	/**
	 * Get devices shared with this user.
	 */
	public function sharedDevices(): HasMany
	{
		return $this->hasMany(DeviceShare::class, 'shared_with_user_id')
			->with('device');
	}

	/**
	 * Get all devices accessible by this user (owned + shared).
	 */
	public function accessibleDevices()
	{
		$ownedDeviceIds = $this->smartDevices()->pluck('id');
		$sharedDeviceIds = DeviceShare::where('shared_with_user_id', $this->id)->pluck('device_id');
		$allDeviceIds = $ownedDeviceIds->merge($sharedDeviceIds)->unique();
		
		return SmartDevice::whereIn('id', $allDeviceIds);
	}

    /**
     * Get the latest valid OTP for a specific type.
     */
    public function getLatestOtp(string $type): ?Otp
    {
        return $this->otps()
            ->ofType($type)
            ->valid()
            ->latest()
            ->first();
    }
}
