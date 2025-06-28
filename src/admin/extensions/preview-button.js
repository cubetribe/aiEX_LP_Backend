import React from 'react';
import { useCMEditViewDataManager } from '@strapi/helper-plugin';
import { Box, Link, Icon } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';

const PreviewButton = () => {
  const { modifiedData } = useCMEditViewDataManager();
  
  if (!modifiedData?.previewUrl) {
    return null;
  }

  return (
    <Box marginTop={4}>
      <Link 
        href={modifiedData.previewUrl} 
        isExternal
        className="preview-button"
      >
        <Icon as={ExternalLink} />
        Preview Campaign
      </Link>
    </Box>
  );
};

// Hook to inject into campaign edit view
const enhanceCampaignEdit = () => {
  const { layout } = useCMEditViewDataManager();
  
  // Add preview button to the right section
  if (layout?.contentType?.uid === 'api::campaign.campaign') {
    // Inject preview button
    return <PreviewButton />;
  }
  
  return null;
};

export default enhanceCampaignEdit;