<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogBroadcastingAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('broadcasting/auth')) {
            $tokenFromQuery = $request->query('token');
            $bearerToken = $request->bearerToken();

            if (! $bearerToken && $tokenFromQuery) {
                $request->headers->set('Authorization', 'Bearer '.$tokenFromQuery);
            }
        }

        return $next($request);
    }
}
