// Comprehensive API key debugging and validation utility

export interface APIKeyDiagnostics {
  isValidFormat: boolean;
  hasBasicAccess: boolean;
  hasRealtimeAccess: boolean;
  billingStatus: 'unknown' | 'active' | 'expired' | 'no_credits';
  organizationId?: string;
  projectId?: string;
  keyType: 'user' | 'project' | 'service' | 'unknown';
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export const diagnoseAPIKey = async (apiKey: string): Promise<APIKeyDiagnostics> => {
  const result: APIKeyDiagnostics = {
    isValidFormat: false,
    hasBasicAccess: false,
    hasRealtimeAccess: false,
    billingStatus: 'unknown',
    keyType: 'unknown',
    errors: [],
    warnings: [],
    recommendations: [],
  };

  // 1. Format validation
  console.log('🔍 Step 1: Validating API key format...');
  if (!apiKey || typeof apiKey !== 'string') {
    result.errors.push('API key is required and must be a string');
    return result;
  }

  const trimmedKey = apiKey.trim();
  if (trimmedKey.length === 0) {
    result.errors.push('API key cannot be empty');
    return result;
  }

  if (!trimmedKey.startsWith('sk-')) {
    result.errors.push('Invalid API key format. OpenAI API keys must start with "sk-"');
    return result;
  }

  result.isValidFormat = true;
  
  // Determine key type
  if (trimmedKey.startsWith('sk-proj-')) {
    result.keyType = 'project';
    console.log('🔑 Detected: Project-scoped API key');
  } else if (trimmedKey.startsWith('sk-svcacct-')) {
    result.keyType = 'service';
    console.log('🔑 Detected: Service account API key');
  } else if (trimmedKey.startsWith('sk-')) {
    result.keyType = 'user';
    console.log('🔑 Detected: User API key');
  }

  console.log(`🔑 API Key: ${trimmedKey.substring(0, 12)}...${trimmedKey.substring(trimmedKey.length - 4)}`);
  console.log(`🔑 Length: ${trimmedKey.length} characters`);

  // 2. Basic API access test
  console.log('🔍 Step 2: Testing basic API access...');
  try {
    const modelsResponse = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${trimmedKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (modelsResponse.ok) {
      result.hasBasicAccess = true;
      console.log('✅ Basic API access confirmed');
      
      const data = await modelsResponse.json();
      console.log(`📊 Available models: ${data.data?.length || 0}`);
      
      // Check for GPT-4 models (indicates higher tier access)
      const gpt4Models = data.data?.filter((model: any) => 
        model.id.includes('gpt-4') || model.id.includes('gpt-4o')
      );
      if (gpt4Models?.length > 0) {
        result.warnings.push(`GPT-4 access detected (${gpt4Models.length} models)`);
        result.billingStatus = 'active';
      }
      
    } else {
      const errorText = await modelsResponse.text();
      console.error(`❌ Basic API access failed: ${modelsResponse.status}`);
      
      if (modelsResponse.status === 401) {
        result.errors.push('API key is invalid or revoked');
        result.recommendations.push('1. Verify the API key at platform.openai.com/api-keys');
        result.recommendations.push('2. Check if the key has been revoked or expired');
        result.recommendations.push('3. Ensure you copied the entire key without spaces');
        return result;
      }
      
      if (modelsResponse.status === 429) {
        result.errors.push('Rate limit exceeded');
        result.recommendations.push('Wait a moment and try again');
        result.billingStatus = 'no_credits';
      }
      
      if (modelsResponse.status === 403) {
        result.errors.push('Forbidden - insufficient permissions');
        result.recommendations.push('Check your organization/project permissions');
      }
    }
  } catch (error) {
    result.errors.push(`Network error during basic test: ${error}`);
    result.recommendations.push('Check your internet connection');
  }

  // 3. Realtime API access test
  if (result.hasBasicAccess) {
    console.log('🔍 Step 3: Testing Realtime API access...');
    try {
      const realtimeResponse = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${trimmedKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session: {
            type: 'realtime',
            model: 'gpt-realtime',
          },
        }),
      });

      if (realtimeResponse.ok) {
        result.hasRealtimeAccess = true;
        console.log('✅ Realtime API access confirmed');
        result.billingStatus = 'active';
      } else {
        const errorText = await realtimeResponse.text();
        console.error(`❌ Realtime API access failed: ${realtimeResponse.status}`);
        
        if (realtimeResponse.status === 403) {
          result.errors.push('Realtime API access not enabled for this key');
          result.recommendations.push('1. Contact OpenAI support to enable Realtime API access');
          result.recommendations.push('2. Ensure your account has sufficient billing credits');
          result.recommendations.push('3. Check if Realtime is available in your region');
        }
        
        if (realtimeResponse.status === 429) {
          result.warnings.push('Rate limited on Realtime endpoint');
          result.billingStatus = 'no_credits';
        }
      }
    } catch (error) {
      result.errors.push(`Network error during Realtime test: ${error}`);
    }
  }

  // 4. Generate final recommendations
  if (result.keyType === 'project') {
    result.recommendations.push('Using project-scoped key - ensure the project has Realtime access enabled');
  }

  if (!result.hasRealtimeAccess && result.hasBasicAccess) {
    result.recommendations.push('Consider requesting Realtime API access from OpenAI');
    result.recommendations.push('Check if your billing tier supports Realtime features');
  }

  if (result.billingStatus === 'no_credits') {
    result.recommendations.push('Add billing credits to your OpenAI account');
  }

  return result;
};

export const printDiagnostics = (diagnostics: APIKeyDiagnostics): void => {
  console.log('\n🔬 API Key Diagnostics Report');
  console.log('=====================================');
  
  console.log(`✅ Valid Format: ${diagnostics.isValidFormat}`);
  console.log(`🔑 Key Type: ${diagnostics.keyType}`);
  console.log(`🌐 Basic Access: ${diagnostics.hasBasicAccess}`);
  console.log(`⚡ Realtime Access: ${diagnostics.hasRealtimeAccess}`);
  console.log(`💳 Billing Status: ${diagnostics.billingStatus}`);
  
  if (diagnostics.errors.length > 0) {
    console.log('\n❌ Errors:');
    diagnostics.errors.forEach((error, i) => console.log(`  ${i + 1}. ${error}`));
  }
  
  if (diagnostics.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    diagnostics.warnings.forEach((warning, i) => console.log(`  ${i + 1}. ${warning}`));
  }
  
  if (diagnostics.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    diagnostics.recommendations.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
  }
  
  console.log('=====================================\n');
};
