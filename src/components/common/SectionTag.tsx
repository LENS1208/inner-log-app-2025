import React from 'react';

type SectionTagProps = {
  children: React.ReactNode;
};

export default function SectionTag({ children }: SectionTagProps) {
  return <span className="tag">{children}</span>;
}
