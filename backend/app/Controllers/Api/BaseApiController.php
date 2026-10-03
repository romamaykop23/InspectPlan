<?php

namespace App\Controllers\Api;

use CodeIgniter\Controller;
use CodeIgniter\HTTP\ResponseInterface;

abstract class BaseApiController extends Controller
{
    /**
     * Успешный JSON-ответ.
     */
    protected function json(mixed $data, int $status = 200): ResponseInterface
    {
        return $this->response
            ->setStatusCode($status)
            ->setJSON($data);
    }

    /**
     * Ошибка в едином формате.
     */
    protected function error(
        string $code,
        string $message,
        int $status = 400,
        array $details = []
    ): ResponseInterface {
        return $this->json([
            'error' => [
                'code'    => $code,
                'message' => $message,
                'details' => $details ?: (object) [],
            ],
        ], $status);
    }

    /**
     * Универсальное чтение входных данных (JSON или form-data).
     */
    protected function input(): array
    {
        $contentType = $this->request->getHeaderLine('Content-Type');
        if (str_contains($contentType, 'application/json')) {
            $json = $this->request->getJSON(true);
            return is_array($json) ? $json : [];
        }
        return $this->request->getPost() ?? [];
    }
}