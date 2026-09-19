<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique(User::class),
            ],
            'password' => $this->passwordRules(),
        ])->validate();

        // Split the full name into first and last names to match the users table schema
        $fullName = trim($input['name']);
        $nameParts = preg_split('/\s+/', $fullName, 2);

        $firstName = $nameParts[0] ?? $fullName;
        $lastName = $nameParts[1] ?? $firstName;

        // Derive a simple username from the email prefix, falling back to the first name
        $emailPrefix = strstr($input['email'], '@', true) ?: $firstName;

        return User::create([
            'fname' => $firstName,
            'lname' => $lastName,
            'username' => $emailPrefix,
            'email' => $input['email'],
            'password' => $input['password'],
        ]);
    }
}
