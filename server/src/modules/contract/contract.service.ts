import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../../config/firebase-admin.config';
import axios from 'axios';

interface ContractExpectation {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  expectedStatus: number;
  expectedHeaders?: Record<string, string>;
  expectedBodySchema?: Record<string, unknown>;
}

interface Contract {
  id: string;
  userId: string;
  consumer: string;
  provider: string;
  baseUrl: string;
  expectations: ContractExpectation[];
  version: number;
  status: 'ACTIVE' | 'VERIFIED' | 'BROKEN';
  createdAt: Date;
  updatedAt: Date;
}

interface VerificationResult {
  contractId: string;
  passed: boolean;
  results: Array<{
    expectation: ContractExpectation;
    passed: boolean;
    actualStatus?: number;
    actualHeaders?: Record<string, string>;
    errors: string[];
  }>;
  verifiedAt: Date;
}

@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);

  constructor(private readonly firebaseAdmin: FirebaseAdminService) {}

  private get db() {
    return this.firebaseAdmin.firestore();
  }

  async defineContract(
    userId: string,
    contract: {
      consumer: string;
      provider: string;
      baseUrl: string;
      expectations: ContractExpectation[];
    },
  ): Promise<{ contractId: string }> {
    const contractRef = this.db
      .collection(`users/${userId}/contracts`)
      .doc();

    const newContract: Omit<Contract, 'id'> = {
      userId,
      consumer: contract.consumer,
      provider: contract.provider,
      baseUrl: contract.baseUrl,
      expectations: contract.expectations,
      version: 1,
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await contractRef.set(newContract);

    this.logger.log(
      `Created contract ${contractRef.id}: ${contract.consumer} -> ${contract.provider}`,
    );

    return { contractId: contractRef.id };
  }

  async verifyContract(
    userId: string,
    contractId: string,
  ): Promise<VerificationResult> {
    const doc = await this.db
      .doc(`users/${userId}/contracts/${contractId}`)
      .get();

    if (!doc.exists) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const contract = { id: doc.id, ...doc.data() } as Contract;
    const results: VerificationResult['results'] = [];

    for (const expectation of contract.expectations) {
      const result: VerificationResult['results'][0] = {
        expectation,
        passed: true,
        errors: [],
      };

      try {
        const url = `${contract.baseUrl}${expectation.path}`;
        const response = await axios({
          method: expectation.method.toLowerCase() as
            | 'get'
            | 'post'
            | 'put'
            | 'delete'
            | 'patch',
          url,
          headers: expectation.headers,
          data: expectation.body,
          validateStatus: () => true,
          timeout: 10000,
        });

        result.actualStatus = response.status;
        result.actualHeaders = response.headers as Record<string, string>;

        // Validate status code
        if (response.status !== expectation.expectedStatus) {
          result.passed = false;
          result.errors.push(
            `Expected status ${expectation.expectedStatus}, got ${response.status}`,
          );
        }

        // Validate expected headers
        if (expectation.expectedHeaders) {
          for (const [key, value] of Object.entries(
            expectation.expectedHeaders,
          )) {
            const actual = response.headers[key.toLowerCase()];
            if (actual !== value) {
              result.passed = false;
              result.errors.push(
                `Expected header "${key}: ${value}", got "${actual}"`,
              );
            }
          }
        }
      } catch (err) {
        result.passed = false;
        result.errors.push(`Request failed: ${err.message}`);
      }

      results.push(result);
    }

    const allPassed = results.every((r) => r.passed);

    // Update contract status
    await this.db
      .doc(`users/${userId}/contracts/${contractId}`)
      .update({
        status: allPassed ? 'VERIFIED' : 'BROKEN',
        updatedAt: new Date(),
      });

    // Store verification result
    const verificationRef = this.db
      .collection(`users/${userId}/contractVerifications`)
      .doc();
    const verification: VerificationResult = {
      contractId,
      passed: allPassed,
      results,
      verifiedAt: new Date(),
    };
    await verificationRef.set(verification);

    return verification;
  }

  async getDiff(
    userId: string,
    contractId: string,
  ): Promise<{
    contractId: string;
    hasChanges: boolean;
    changes: Array<{ field: string; previous: unknown; current: unknown }>;
  }> {
    const verificationsSnapshot = await this.db
      .collection(`users/${userId}/contractVerifications`)
      .where('contractId', '==', contractId)
      .orderBy('verifiedAt', 'desc')
      .limit(2)
      .get();

    if (verificationsSnapshot.docs.length < 2) {
      return {
        contractId,
        hasChanges: false,
        changes: [],
      };
    }

    const [current, previous] = verificationsSnapshot.docs.map((d) => d.data());
    const changes: Array<{
      field: string;
      previous: unknown;
      current: unknown;
    }> = [];

    // Compare results
    const currentResults = current.results || [];
    const previousResults = previous.results || [];

    if (currentResults.length !== previousResults.length) {
      changes.push({
        field: 'expectationCount',
        previous: previousResults.length,
        current: currentResults.length,
      });
    }

    for (
      let i = 0;
      i < Math.min(currentResults.length, previousResults.length);
      i++
    ) {
      if (currentResults[i].passed !== previousResults[i].passed) {
        changes.push({
          field: `expectation[${i}].passed`,
          previous: previousResults[i].passed,
          current: currentResults[i].passed,
        });
      }

      if (currentResults[i].actualStatus !== previousResults[i].actualStatus) {
        changes.push({
          field: `expectation[${i}].actualStatus`,
          previous: previousResults[i].actualStatus,
          current: currentResults[i].actualStatus,
        });
      }
    }

    return {
      contractId,
      hasChanges: changes.length > 0,
      changes,
    };
  }
}
