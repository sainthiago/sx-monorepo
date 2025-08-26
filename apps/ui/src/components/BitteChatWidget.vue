<script setup lang="ts">
import { parseSignature } from 'viem';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { getUserFacingErrorMessage, isUserAbortError } from '@/helpers/utils';

const chatContainer = ref<HTMLDivElement>();
const { auth } = useWeb3();
const uiStore = useUiStore();

// Track React components
let React: any = null;
let ReactDOM: any = null;
let BitteWidgetChat: any = null;
let reactRoot: any = null;

// State to track wallet data - make them reactive
let currentHash = ref<string | undefined>();
let currentSignature = ref<
  | { r: `0x${string}`; s: `0x${string}`; v: bigint; yParity: number }
  | { r: `0x${string}`; s: `0x${string}`; yParity: number; v?: undefined }
  | undefined
>();

// Create reactive wallet config
const walletConfig = computed(() => {
  if (!auth.value) return undefined;
  return {
    evm: {
      address: auth.value.account,
      chainId: auth.value.provider?.network?.chainId,
      hash: currentHash.value,
      signature: currentSignature.value,
      sendTransaction: async (transaction: any) => {
        if (!auth.value?.provider) {
          throw new Error('No provider available');
        }

        try {
          // Use the same getSigner pattern as the rest of the project
          const signer = auth.value.provider.getSigner();

          const tx = await signer.sendTransaction(transaction);

          const receipt = await tx.wait();

          currentHash.value = receipt.transactionHash || tx.hash;

          // Add success notification using the same pattern as useActions
          if (currentHash.value) {
            uiStore.addNotification(
              'success',
              'Transaction completed successfully'
            );
          }

          return { hash: currentHash.value };
        } catch (error) {
          console.error('🔴 Transaction failed:', error);

          // Use the same error handling pattern as useActions
          if (!isUserAbortError(error)) {
            uiStore.addNotification('error', getUserFacingErrorMessage(error));
          }

          throw error;
        }
      },
      signMessage: async (message: string) => {
        if (!auth.value?.provider) {
          throw new Error('No provider available');
        }

        try {
          // Use the same getSigner pattern as the rest of the project
          const signer = auth.value.provider.getSigner();

          const signature = await signer.signMessage(message);

          currentSignature.value = signature
            ? parseSignature(signature as `0x${string}`)
            : undefined;

          return signature;
        } catch (error) {
          console.error('🔴 Message signing failed:', error);

          if (!isUserAbortError(error)) {
            uiStore.addNotification('error', getUserFacingErrorMessage(error));
          }

          throw error;
        }
      },
      signTypedData: async (typedData: any) => {
        if (!auth.value?.provider) {
          throw new Error('No provider available');
        }

        try {
          // Use the same getSigner pattern as the rest of the project
          const signer = auth.value.provider.getSigner();
          const parsedTypedData =
            typeof typedData === 'string' ? JSON.parse(typedData) : typedData;

          const cleanTypes = { ...parsedTypedData.types };
          delete cleanTypes.EIP712Domain;

          const signature = await signer._signTypedData(
            parsedTypedData.domain,
            cleanTypes,
            parsedTypedData.message
          );

          // Ensure signature starts with 0x
          let normalizedSignature = signature;
          if (!signature.startsWith('0x')) {
            normalizedSignature = `0x${signature}`;
          }

          try {
            // Use viem's parseSignature to properly parse the signature
            const parsedSig = normalizedSignature
              ? parseSignature(normalizedSignature as `0x${string}`)
              : undefined;

            currentSignature.value = parsedSig;

            // Return just the signature string - let the widget handle parsing
            return;
          } catch (parseError) {
            console.error('🔴 Viem signature parsing failed:', parseError);
            console.error('🔴 Falling back to original signature');
          }
        } catch (error) {
          console.error('🔴 Typed data signing failed:', error);
          console.error('🔴 Error details:', {
            message: (error as any).message,
            code: (error as any).code,
            stack: (error as any).stack
          });

          if (!isUserAbortError(error)) {
            uiStore.addNotification('error', getUserFacingErrorMessage(error));
          }

          throw error;
        }
      },
      switchChain: async (chainId: number | any) => {
        if (!auth.value?.provider?.provider?.request) {
          throw new Error('No provider available');
        }

        try {
          const actualChainId =
            typeof chainId === 'object' && chainId?.id
              ? chainId.id
              : typeof chainId === 'number'
                ? chainId
                : parseInt(chainId);

          const encodedChainId = `0x${actualChainId.toString(16)}`;

          await auth.value.provider.provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: encodedChainId }]
          });

          return true;
        } catch (error) {
          console.error('🔴 Chain switch failed:', error);

          if (!isUserAbortError(error)) {
            uiStore.addNotification('error', getUserFacingErrorMessage(error));
          }

          throw error;
        }
      }
    }
  };
});

onMounted(async () => {
  try {
    // Dynamically import React and Bitte AI Chat
    const [reactModule, reactDOMModule, chatModule] = await Promise.all([
      import('react'),
      import('react-dom/client'),
      import('@bitte-ai/chat')
    ]);

    React = reactModule.default;
    ReactDOM = reactDOMModule;
    BitteWidgetChat = chatModule.BitteWidgetChat;

    if (chatContainer.value) {
      initializeBitteWidget();
    } else {
      console.log('🔴 chatContainer.value is null');
    }
  } catch (error) {
    console.error('Failed to load Bitte AI Chat:', error);
  }
});

function initializeBitteWidget() {
  if (
    !React ||
    !ReactDOM ||
    !BitteWidgetChat ||
    !chatContainer.value ||
    reactRoot
  ) {
    return;
  }

  // Create React root only once
  reactRoot = ReactDOM.createRoot(chatContainer.value);

  // Initial render
  renderBitteWidget();
}

function renderBitteWidget() {
  if (!reactRoot || !React || !BitteWidgetChat) {
    console.log('🔴 Cannot render - missing React root or components');
    return;
  }

  // Create React element with current props
  const chatElement = React.createElement(BitteWidgetChat, {
    agentId: 'snapshot-agent-theta.vercel.app',
    apiUrl: '/api/chat',
    format: 'markdown',
    wallet: walletConfig.value,
    options: { agentName: 'Snapshot DAO Agent' },
    widget: {
      triggerButtonStyles: {
        logoColor: '#FFAC32'
      },
      widgetWelcomePrompts: {
        questions: [
          'Do I have any open proposals?',
          'Show the latest proposals for cow.eth',
          'Search for uniswap spaces'
        ],
        actions: [
          'Vote yes on x proposal',
          'Do I have voting power on X proposal',
          'what can I do here?'
        ]
      }
    }
  });

  // Re-render with updated props (this should preserve internal state better)
  reactRoot.render(chatElement);
}

// Watch for auth changes and re-render widget
watch(
  () => auth.value,
  () => {
    if (reactRoot && React && BitteWidgetChat) {
      renderBitteWidget();
    }
  },
  { deep: true }
);

// Watch for signature/hash changes and re-render widget
watch([currentHash, currentSignature], () => {
  if (reactRoot && React && BitteWidgetChat) {
    renderBitteWidget();
  }
});

onUnmounted(() => {
  if (reactRoot && reactRoot.unmount) {
    reactRoot.unmount();
    reactRoot = null;
  }
});
</script>

<template>
  <div ref="chatContainer" class="bitte-chat-container" />
</template>

<style scoped>
.bitte-chat-container {
  width: 100%;
  height: 100%;
}

/* Ensure the Bitte chat styles work well with the existing UI */
.bitte-chat-container :deep(.bitte-widget) {
  z-index: 9999;
}
</style>
